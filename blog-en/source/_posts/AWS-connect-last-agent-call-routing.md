---
title: AWS connect last agent call routing
date: 2024-05-21 21:22:56
categories: [Explorations]
tags: [Amazon connect, Serviceless]
thumbnail: /gallery/thumbnails/2024/call-center.png
---
## Challenge
In a recent project, we were assigned the task to route calls to the last agent who interacted with the caller.
This requirement may seem fundamental, but it proved to be more complex than anticipated,
especially considering its integration into Salesforce via Salesforce Service Cloud Voice.

<!-- more -->

## Solution
The proposed solution is relatively straightforward.
We will employ a Lambda function to query recent voice calls and retrieve information about the previous queue and agent.
If the agent is available and the customer wishes to continue the previous call, the call will be transferred to that same agent.
However, should any errors occur during this process, the call will follow the normal flow.

In summary:

1. A Lambda function will retrieve details about the customer's previous call, including the queue and agent.
2. If the previous agent is available and the customer wants to resume the call, the new call will be transferred to that agent.
3. If any issues arise during this process (such as agent unavailability or customer preference), the call will proceed through the regular call flow.

## Implementation

### Update IVR
First, invoke the Lambda to retrieve the last agent and queue, then set the agent to the working queue.
Before transferring the call to the queue, we need to check if the agent is available and provide the customer with the option to continue the previous call or not.
The IVR flow is depicted as follows:

![Updated IVR](/gallery/site/2024/ivr.png)

### Lambda Get Last Voice Call
Now, the only remaining task is to retrieve the last agent.
Unfortunately, the `SearchContactsCommand` from aws client does not support searching for contacts by customer phone number, possibly due to privacy concerns.
As a workaround, we can set a custom contact attribute (e.g., CustomerPhoneNumber) and mark it as searchable.
Then, using the `SearchContactsCommand`, we can search for contacts by the searchable attributes.
It's important to note that contacts created before adding the searchable key will still not be searchable.
Additionally, we can set a time range in this Lambda to search for contacts within the past 7 days. The code snippets are as follows:


```ts
const input: SearchContactsRequest = {
  InstanceId,
  TimeRange: {
    Type: "INITIATION_TIMESTAMP",
    StartTime: new Date(Date.now() - 7 * 24 * 3600 * 1000), // Since 7 days ago
    EndTime: new Date(),
  },
  SearchCriteria: {
    Channels: [
      "VOICE",
    ],
    SearchableContactAttributes: {
      Criteria: [
        {
          Key: "CustomerPhoneNumber",
          Values: [
            phoneNumber,
          ],
        },
      ],
      MatchType: "MATCH_ALL",
    },
  },
  MaxResults: 10,
  Sort: {
    FieldName: "INITIATION_TIMESTAMP",
    Order: "DESCENDING",
  },
};
const command = new SearchContactsCommand(input);
const response = await client.send(command);
const lastContact = (response.Contacts ?? []).filter((contact) => contact.AgentInfo?.Id)[0]
```

## Conclusion 
At last year's AWS conference, I observed a promising demonstration of Amazon Connect integrated with AI, highlighting its potential to proactively resolve customer issues.
However, I was surprised to discover that implementing last-agent call routing, which I deemed fundamental, lacked an out-of-the-box solution in Amazon Connect.
This realization prompted us to develop a custom solution to address this critical requirement.

Reference post [Last Agent and Last Queue Routing on Amazon Connect for Returning Callers](https://aws.amazon.com/blogs/contact-center/last-agent-and-last-queue-routing-on-amazon-connect-for-returning-callers/)