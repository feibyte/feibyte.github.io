---
title: How to prevent duplicate SQS messages
date: 2024-05-11 07:52:05
categories: [实践总结]
tags: [AWS, SQS Processor, Serviceless]
thumbnail: /gallery/thumbnails/2024/sqs.png
---

## Problem

In our system, queue processors must implement idempotency to prevent the double-processing of messages. Duplicate messages may arise in the following scenarios:

1. **Scheduler and Message Producer**: The scheduler or message producer may be triggered multiple times, occasionally rerunning due to timeouts.

2. **Queue Management**: If a lambda instance times out while processing a message, another instance may retrieve the same message if the visibility timeout is not properly set.


This can have terrible consequences. We aim to avoid sending duplicate emails or messages to our customers, not to mention inadvertently delivering duplicate gift cards.

So a generic idempotency mechanism is required.

## Solution

The idea is straightforward: we will use a DynamoDB / Redis cache to store the message ID and the processing status.
When a message is received, we will check the record to see if it has been processed.
If it has, we will skip the message. If not, we will process it and update the cache.
Considering our serverless architecture, DynamoDB is selected.

Basically, there are three cases:
1. Message first time processed:  process the message.
2. Message is being processed or has been processed: discard the message.
3. Message processing failed: reprocess the message.  
   To handle this case, we need to add a lock timeout to the record. If the message is still in processing status after the lock timeout, we give it another chance to be processed.

## Implementation

1. Create a DynamoDB table `message-processor`. It's a normal table with a primary key `messageId`.
2. Implement a service with this interface:
```typescript
interface IMessageProcessorService {
  /**
   * Here use DynamoDB message-processor table as the fact store to decide if a message has been seen before
   * @param messageId unique identifier for each message
   * @param lockTimeoutInSeconds how long to lock the message for processing. It gives another chance to reprocess the message if it fails.
   * @returns boolean: true indicates the lock is acquired and should continue the processing.
   *                   false indicates the message is already being processed or being processed by another instance.
   */
  acquireProcessingLock(messageId: string, lockTimeoutInSeconds: number): Promise<boolean>;

  /**
   * Mark the message as processed, preventing it from being processed again
   * @param messageId
   */
  markMessageProcessed(messageId: string): Promise<void>;

  /**
   * Remove record of failed message processing, allowing it to be processed again
   * @param messageId
   */
  releaseProcessingLock(messageId: string): Promise<void>;
}
```

The code snippet below shows how to implement the `acquireProcessingLock` method:
(Never mind, we're using internal libraries to simplify the code)
```typescript
await this.store.replace(
  {
    _id: id,
    status: ProcessReceiptsStatus.PROCESSING,
    timestamp: Date.now(),
  },
  {
    condition: {
      $or: [
        { _id: { $exists: false } }, // insert new record
        {
          $and: [
            { timestamp: { $lt: Date.now() - lockTimeoutInSeconds * 1000 } },
            { status: { $eq: ProcessReceiptsStatus.PROCESSING } },
          ],
        },
      ],
    },
  },
);
```

At last, we enhance the existing message handler with the idempotency mechanism:
```typescript

export const makeHandlerIdempotent = async <T>(
  handler: MessageHandler<T>,
  IdGenerator: (message: T) => string,
  {
    processReceiptsService,
    lockTimeoutInSeconds,
    logger,
  }: {
    logger: ILoggerService;
    processReceiptsService: IProcessReceiptsService;
    lockTimeoutInSeconds: number;
  },
): Promise<MessageHandler<T>> => {
  return async (message: T) => {
    const id = IdGenerator(message);
    const acquiredProcessingExclusiveLock = await processReceiptsService.acquireProcessingLock(
      id,
      lockTimeoutInSeconds,
    );
    if (!acquiredProcessingExclusiveLock) {
      logger.info('processMessageIdempotent: message has already been processed', { message });
      return;
    }
    try {
      const result = await handler(message);
      await processReceiptsService.markMessageProcessed(id);
      return result;
    } catch (error) {
      await processReceiptsService.releaseProcessingLock(id);
      throw error;
    }
  };
};
```

## Conclusion
It seems preventing duplicate messages in a distributed system is likely a common requirement.
While implementing this idempotency mechanism, I found almost similar solution discussed [How to prevent duplicate SQS Messages?](https://stackoverflow.com/questions/23260024/how-to-prevent-duplicate-sqs-messages)
It was very helpful and offered clear explanations.