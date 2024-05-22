---
title: AWS Connect 转接最近通话的客服
date: 2024-05-21 21:22:56
categories: [实践总结]
tags: [Amazon connect, Serviceless]
thumbnail: /gallery/thumbnails/2024/call-center.png
---
## 需求
最近接到一个需求，需要将客户来电转接到最近与客户通话的客服。这个需求很容易理解，
客户可能因为各种各样的原因中断通话，再次来电很可能是因为同一个诉求，比如保险索赔，可能需要多次来回沟通。
将通话转给同一个客服，客服可以接着继续处理而不用熟悉客户场景，这样做能够提高处理效率。
尽管这个需求看起来很基础，但是并没有一个开箱可用的方案。我们的呼叫中心是 Amazon Connect，不过并没有启用 Profile，一些方案也不能采用。

<!-- more -->

## 方案
解决思路很简单，我们可以添加一个 Lambda 函数来查询最近的通话记录，获取上次通话的队列（`queue`）和客服（`agent`）信息，如果查到的客服在线，并且客户想继续上次通话，则将通话转接到上次通话的客服。
如果在这个过程中出现任何错误（比如客服不在线或者客户不想继续上次通话），通话将按照正常流程进行。我们需要做的是：
1. Lambda 函数将检索有关客户上次通话的详细信息，包括队列和客服。
2. 如果上次客服在线并且客户想继续通话，新通话将转接到该客服。
3. 如果在此过程中出现任何问题（例如客服不可用或客户偏好），通话将按照正常流程进行。

## 实现

### 更新 IVR

首先，更新 IVR：调用 Lambda 函数检索上次客服和队列，然后将客服设置为工作队列，之后检查客服状态，询问客户是否继续上次通话。IVR 流程如下：

![Updated IVR](/gallery/site/2024/ivr.png)

### Lambda 获取上次通话
现在，剩下的工作就是获取上次通话客服。有个问题是 aws client 的 `SearchContactsCommand` 不支持通过客户电话号码搜索通话，可能是出于隐私考虑吧。一个变通的解决方法是：
设置一个自定义的联系人属性（例如 CustomerPhoneNumber）并将其标记为可搜索。然后，使用 `SearchContactsCommand` 搜索属性搜索联系人。当然在 IVR 设置中设置 CustomerPhoneNumber 为通话电话号码。
需要注意的是，添加可搜索键之前创建的联系人仍然不可搜索。此外，我们只需搜索过去 7 天内的通话，太久的通话很可能不太相关。代码片段如下：

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

## 后续
实现和测试这个功能并不复杂，但是我们没有上线这个功能。问题在需求上：一是客服刚好在线的概率不高，二是客服在线的话，直接转接就像插队，需求需要继续讨论。

## 总结 
去年参加 AWS Conference 时，一场演讲就是介绍 Amazon Connect 与 AI 的集成，展示了它主动解决客户问题的潜力。比如客户电话刚接通，AI 就开始询问是否是因为某些事情来电等等，看起来很有炫酷。
但是，最近要实现的这个本来以为很普通的功能却都找不到一个开箱可用的方案，着实让人有些意外。当然我们也在考虑整合它们的 AI，不过还没那么快。

参考实现 [Last Agent and Last Queue Routing on Amazon Connect for Returning Callers](https://aws.amazon.com/blogs/contact-center/last-agent-and-last-queue-routing-on-amazon-connect-for-returning-callers/)
可以优化的地方：根据用户的上次通话的满意度，决定是否转接到上次通话的客服。