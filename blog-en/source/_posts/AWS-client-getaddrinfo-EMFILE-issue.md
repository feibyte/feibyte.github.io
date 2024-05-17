---
title: AWS client getaddrinfo EMFILE issue
date: 2024-05-16 23:17:22
categories: [Explorations]
tags: [AWS, Client, Serviceless]
thumbnail: /gallery/thumbnails/aws/lambda.png
---
Recently, we introduced AWS Cloud Map for service discovery, primarily to retrieve queue URLs. However, after deployment, we encountered intermittent errors weeks later, logged as getaddrinfo EMFILE events.ap-southeast-2.amazonaws.com. Not all requests triggered this error, indicating a selective issue.

Upon inspection, it became apparent that we were facing a socket timeout problem, a known issue in our setup. The remedy was simple: reusing our existing agent.

<!-- more -->

```ts
const keepAliveAgent = new HttpsAgent({ keepAlive: true, maxSockets: 500 });
```

## Unpacking the Issue

In our codebase, each lambda utilizes a createService function to generate service instances for each request/run. Attempts to switch to a singleton instance were met with complications, prompting a rollback.

The core problem emerged: with a new client instance created for each request, sockets held by the HTTP agent from each run might not be released, leading to hitting the socket limit before garbage collection could free them.

During periods of low traffic, the issue remained dormant, with lambda invocations being infrequent. However, the potential for overload was evident, given that a lambda can manage up to 1024 outgoing connections, a threshold that could be gradually reached over time.

A similar issue surfaced in other resource integrations. Investigation revealed that our OpenAPI-generated client was using a singleton instance:

```ts
const keepAliveAgent = new HttpsAgent({ keepAlive: true, timeout: 15000 });
```

## Key Takeaways

Reflecting on this incident, we realized some fundamental truths. While such mistakes may seem basic, they underscore the complexities that emerge as systems evolve.

Take away:
`keepAlive` is not default in AWS SDK, you need to set it manually even it's recommended to maintain persistent connections.
In SDK v2, there's a easy way to do that  by setting ` AWS_NODEJS_CONNECTION_REUSE_ENABLED=1`. But it seems removed in SDK v3.
Interestingly, `http.globalAgent` in Node.js set it as default since v19.0.0 https://nodejs.org/en/blog/announcements/v19-release-announce/#http-s-1-1-keepalive-by-default

