---
title: 如何防止重复处理 SQS 消息
date: 2024-05-11 07:52:05
categories: [实践总结]
tags: [AWS, SQS Processor, Serviceless]
thumbnail: /gallery/thumbnails/2024/sqs.png
---

## 问题

一般来说在我们的系统中，消息处理必须保证幂等性，以防止消息重复处理。在我们的系统中，下面两种情况可能导致相同消息被重复处理：
1. **调度器和消息生产者**：调度器或消息生产者可能会被多次触发，比如时不时有些任务因为超时而被多次触发。
2. **队列管理**：如果一个 Lambda 实例处理消息超时，另一个实例可能会在 `visibility timeout` 设置不合适的情况下得到重新处理相同消息的机会。

如果消息被多次处理，我们可能会向客户发送重复的电子邮件和短信，甚至礼品卡都可能重复发送。所以，我们需要一个通用的机制来确保相同消息不会被多次处理。

<!-- more -->

## 解决方案
思路很简单：我们将使用 DynamoDB / Redis 缓存来存储消息 ID 和处理状态。当接收到消息时，我们将检查记录以查看是否已处理。如果已处理，我们将丢弃当前消息。如果没有，我们将处理消息并更新缓存。考虑到我们当前的无服务器架构，DynamoDB 是我们的默认选择。

消息处理有三种情况：
1. 首次处理消息：处理消息。
2. 消息已处理或正在处理：丢弃消息。
3. 消息处理失败：重新处理消息。  
   为了处理这种情况，我们需要为记录添加锁超时。如果消息在锁超时后仍处于正在处理状态，要能够被再次处理。

## 实现

1. 创建 DynamoDB 表 `message-processor`。这是一个普通表，具有主键 `messageId`。
2. 实现下面接口的服务：
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
下面的代码片段展示了如何实现 `acquireProcessingLock` 方法：(我们使用了内部库简化代码)

```typescript
await this.store.replace(
  {
    _id: id,
    status: 'PROCESSING',
    timestamp: Date.now(),
  },
  {
    condition: {
      $or: [
        { _id: { $exists: false } }, // insert new record
        {
          $and: [
            { timestamp: { $lt: Date.now() - lockTimeoutInSeconds * 1000 } },
            { status: { $eq: 'PROCESSING' } },
          ],
        },
      ],
    },
  },
);
```

最后，我们使用一个简单函数封装既有的处理程序：
```typescript
export const makeHandlerIdempotent = async <T>(
  handler: MessageHandler<T>,
  IdGenerator: (message: T) => string,
  {
    messageProcessorService,
    lockTimeoutInSeconds,
    logger,
  }: {
    logger: ILoggerService;
    messageProcessorService: IMessageProcessorService;
    lockTimeoutInSeconds: number;
  },
): Promise<MessageHandler<T>> => {
  return async (message: T) => {
    const id = IdGenerator(message);
    const acquiredProcessingExclusiveLock = await messageProcessorService.acquireProcessingLock(
      id,
      lockTimeoutInSeconds,
    );
    if (!acquiredProcessingExclusiveLock) {
      logger.info('processMessageIdempotent: message has already been processed', { message });
      return;
    }
    try {
      const result = await handler(message);
      await messageProcessorService.markMessageProcessed(id);
      return result;
    } catch (error) {
      await messageProcessorService.releaseProcessingLock(id);
      throw error;
    }
  };
};
```

## 总结
总的来说，防止分布式系统中消息处理似乎是一个常见的需求。在实现过程中，发现一个类似的解决方案 [How to prevent duplicate SQS Messages?](https://stackoverflow.com/questions/23260024/how-to-prevent-duplicate-sqs-messages)，解释的也很详细。