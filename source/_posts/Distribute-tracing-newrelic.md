---
title: Distribute tracing - newrelic
date: 2020-01-07 21:57:05
categories: ["技术"]
tags: NewRelic
thumbnail: /gallery/thumbnails/distributed-tracing.png
---

`newrelic` 提供的 `Distribute tracing` 功能非常实用。阿里内部使用的是鹰眼系统，因为一直做前端开发所以我并不是很清楚到底怎么工作的。虽说之前也多少翻过一些文章介绍大概的系统的架构，但是一直以为在调用下游服务时是显式传入当前 `TraceId` 的。直到最近使用 `newrelic` 的 `Distribute tracing` 追踪才了解到还有一种无侵入的方案。

比较流行的全链路监控方案 `Zipkin` `Pinpoint` `Skywalking` 也有完全无侵入的方案，但都是 JAVA 编写的。而且在搜寻对应的 `Node.js` 实现时，找到的仓库代码往往并不齐全。无奈只能在 `newrelic` 源码中寻找线索，果然发现大量的 `instrumentation`，其中就有对原生 `http`模块上方法的拦截。这样就可以解释为什么我们不需要显式传给下游 `TraceId`。

或许不难猜到，在发起新请求时，只需要把当前的 `traceId` 附带到请求头上即可。在接收请求时解析请求头上信息，并将其传给当前新建的 `transaction` 作为 parentId。
但是还有一个问题：如果有多个请求同时处理，如何保证传给下游正确的 `TraceId`。假设服务端的伪代码是这样的：

```js
app.get('/frontend', (req, res) => {
    asyncTask((is) => {
        const result = await http.get('/downstream');
        res.json(result);
    });
})
```

如果同时有两个请求 `/frontend(1)` `/frontend(2)` 怎么保证调用链不串呢？因为我们并不能保证异步任务的时间，完全有可能第二个请求先调用了下游服务。 `Skywalking Node.js` 就有这样的[问题](https://github.com/SkyAPM/SkyAPM-nodejs/issues/83)。

继续查看代码又有新的发现，`newrelic` 同时也对很多基础模块进行了拦截，包括我能想到的 `Timer`, `Promise` `Async`, `FS` 等等， 包装回调主要目的在执行回调之前找到当时的 segment。


这么多的拦截代码想当然的会需要一定的开销。暂时未见到 `newrelic` 上关于这方面的文档。


更多链接
https://juejin.im/post/5a7a9e0af265da4e914b46f1