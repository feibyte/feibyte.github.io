---
title: Auth0 lock issue
date: 2020-01-17 23:11:42
categories: ["技术"]
tags: ["Auth0", "锁"]
thumbnail: /gallery/thumbnails/mutex.png
---

This Friday when we’re demo case, we noticed that it took a long time to display content on the Home page.  It happened occasionally and soon we found it happened only when we had login into ULP but not the HOME page.  Particularly, if you remove the cookie flag auth0.is.authenticated and refresh the page, you can reproduce it. You might have to wait for more than 10s.


## Reproduce and address potential code
The first step is to check the network activity.  The weird thing was: we got token at 1s roughly and it took about 100ms but the first GraphQL request was started at 11s.  At first, I guessed probably it was blocked by some requests as there were so many requests online. The good thing is we could reproduce it locally. It proved that my guess was wrong after removing all unimportant requests. 

Then I began to log some methods with performance.mark and performance.measure. Soon we find the issue was caused by getTokenSilently API. It took more than 5s even the Network showed it took only 100ms. 


## Look into SDK 
Here’s what I found in that method:

```ts
public async getTokenSilently() {
  options.scope = getUniqueScopes(this.DEFAULT_SCOPE, options.scope);
  await lock.acquireLock(GET_TOKEN_SILENTLY_LOCK_KEY, 5000);
  // 20 lines code
  lock.releaseLock(GET_TOKEN_SILENTLY_LOCK_KEY);
  return authResult.access_token;
}
```

We notice they’re using a lock which is a fresh thing in the FE.  What if we get an exception, does it mean we have to wait for 5s? We might invoke this API a few times as we wanna always get a valid token.  It’s why the GraphQL request began at 11s. Let’s take a look at the source code and see if they fixed it.  Yeah, they were aware of that issue and had already fixed it.   And the new one looks like: 

```ts
try {
  await lock.acquireLock(GET_TOKEN_SILENTLY_LOCK_KEY, 5000);
} finally {
  await lock.releaseLock(GET_TOKEN_SILENTLY_LOCK_KEY);
}
```

Let’s upgrade our package file and give it another try. 🎉
After a few moments ⏰. What? It still took 5s. Maybe I didn’t update the right one, double-double-check: we did have the new package. 

There was something different:  The first GraphQL began at 7s. 


## Understand the Lock 🔐
As we know, we don’t the lock API in FE(There’s an experimental API) They are using the browser-tabs-lock library.  It’s used for preventing two tabs send request parallel.  Basically, they’re using localStorage to implement the lock. Check if the Certain key is set in lcoalStorage, if not set it and acquire the lock successfully. Otherwise, listen to Storage’s event or wait until timeout.

After adding some log statements, I found there was an item in localStorage after redirecting back.  Auth page is unable to access it. Therefore, the only reason was we didn’t clean it before redirecting to the Auth page.  However, before redirect to the Auth page, there’s nothing on the localStorage.  

Here’s related code. Have you noticed the problem?

```ts
const isAuthenticated = await auth0FromHook.isAuthenticated();
if (!isAuthenticated) {
  // Checked there was no item on lcoalStorage
  await auth0FromHook.loginWithRedirect({
    appState: { targetUrl: window.location.href },
  }); // Using location.assign
}
const token = await auth0FromHook.getTokenSilently();
// ... 
```

There’s nothing special with loginWithRedirect API.  The root cause is the script doesn’t stop after location change. The following code getTokenSilently is trying to acquire the lock but it doesn’t have a chance to release the lock as the location was changed. It’s hard to debug it because we can’t set a breakpoint or print any message after location change. 


## Review of the bug
**When was the issue introduced**

In the beginning,  we didn't have this issue as the Auth0 was not using the lock. We upgraded the version to 1.5.0 on 13/11/2019.  It was a minor change and we didn’t notice that. That means we had that issue since then. 

**Why there was no alert from NewRelic**

This bug happens occasionally. It might just have a minor impact on the average time. The page load time fluctuates every day and only keep one week’s data.  It might not be able to noticed in short term.


## Lesson from it
Remember stop the script after location change.