---
title: AWS client getaddrinfo EMFILE issue
date: 2024-05-16 23:17:22
categories: [实践总结]
tags: [AWS, Client, Serviceless]
thumbnail: /gallery/thumbnails/aws/lambda.png
---

最近，在我们系统中引入了 AWS Cloud Map 作为我们的服务发现系统。部署几周后没有问题，今天突然抛出错误，日志显示错误 `getaddrinfo EMFILE events.ap-southeast-2.amazonaws.com`。
当然，并非所有请求都触发了此错误，只是在高流量时段才出现了这个错误。

<!-- more -->

不难排查这是一个 Socket 泄露问题，在我们的系统中算是一个已知问题。解决方法很简单：复用实例 `keepAliveAgent`。
```ts
const keepAliveAgent = new HttpsAgent({ keepAlive: true, maxSockets: 500 });
```

## 问题根源

在我们的代码库中，每个 `Lambda` 都有一个对应的 `createService` 负责创出服务实例。问题是：我们是为每次请求生成一个新的实例。之前尝试过切换到单例时，因为一些依赖必须动态创建，最后放弃了。

问题原因很明显：每次运行创建一个新的 `HttpsAgent` 实例， 而旧的 `HttpsAgent` 持有的 `sockets` 并没有被及时释放，很快就导致连接用尽的问题。

在开发测试阶段，请求不多这个没有暴露，因为不会超过 Lambda 限制的连接数 1024 ，问题是在部署几周之后才突然出现的。

当然这个问题应该不仅限于 AWS 客户端，检查了 OpenAPI 生成的客户端服用类似单例：
```ts
const keepAliveAgent = new HttpsAgent({ keepAlive: true, timeout: 15000 });
```

这个算是我们整个系统的一个设计问题，短期内不大可能会改动，只能是尽量避免这种错误发现。

## 教训
回过头看下这个问题，可以说是很基本的错误，即便是新手也很容易觉察出问题。这些基本的错误在系统变复杂的时候，也会变得难以发现和不可避免。
很多时候一些知识点看起来很简单，简单到没被注意到，往往在触发了一个线上故障的之后，才重视起来。
