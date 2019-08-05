---
title: "前端三俗之Promise"
date: 2014-03-29
category: 造轮子
tags: [Promise]
---

这篇文章很好的介绍了Promise  <http://www.html5rocks.com/zh/tutorials/es6/promises/>

<!-- more -->

前端乱炖上有篇文章介绍了它的简易实现  <http://www.html-js.com/article/1850>

作为一个俗人，怎么会不用自己的逻辑再实现一遍呢。因为defer更为常见，就说说defer吧
```js
  var d = new Defer(function (resolve, reject) {
      setTimeout(function () {
          resolve('start');
      }, 1000);
  });
  d.then(function (x) {
      console.log('then --' + x)
      return 'filter';
  }).then (function (value) {
      console.log('then ----' + value);
      return '***';
  });
```

完成上面的功能，分析一下我们需要实现的有这么几个方法：then resovle reject。then做的事情就push回调，resovle reject就是唤醒处理。
```js
function defer (func) {
  var observers = [];
  var state = 0;
  function then (onFulfill, onError) {
    observers.push([onFulfill, onError]);
    return this;
  }
  function exec (result) {
    while (observers.length) {
        var observer = observers.shift();
        observer[state](result);
    }
    observers = null;
  }
  function resovle (x) {
    state = 0;
    exec(x);
  }
  function reject (x) {
    state = 1;
    exec(x);
  }
  func(resovle, reject);
  return {
    then: then
  }
}
```
这个屌丝版defer还有几个问题：

1. 调用then的时候可能已经执行过resovle了，需要重新执行一次。
2. 没有考虑返回值是Promise的情况
3. 值没有传给下一个then处理  

处理一下这几个问题后：
```js
function defer (func) {
  var observers = [];
  var state = 0;
  function then (onFulfill, onError) {
    if (observers) {
      observers.push([onFulfill, onError]);
    } else {
      observers = [];
      observers.push([onFulfill, onError]);
      exec();
    }
    return this;
  }
  function exec (result) {
    while (observers.length) {
      var observer = observers.shift();
      if (typeof observer[state] !== 'function') {
        continue;
      }
      try {
        result = observer[state](result);
        if (result && typeof (result.then) === 'function') {//返回的是defer
          return result.then(resolve, reject);
        }
      } catch (e) {
        state = 1;
        result = e;
      }
    }
    observers = null;
  }
  function resovle (x) {
    state = 0;
    exec(x);
  }
  function reject (x) {
    state = 1;
    exec(x);
  }
  func(resovle, reject);
  return {
    then: then
  };
}
```
看上去虽说屌丝，不过好像功能还行，而且逻辑很简单。但是跟标准有点不一样：
`defer.then().then()` 和 `defer.then(); defer.then()` 按照标准是执行结果是不同的。如果按照上面的代码逻辑，处理的结果却是一样的，因为 then 只是简单的返回了 this。这儿的 then 应该返回一个新的defer对象。大概是这样子:

```js
function defer () {
    var observers = [];
    function then (onFulfil, onError) {
      var deferred = new defer();
      function resolve (value) {
        var ret = onFulfil ? onFulfil(value) : value;
        deffrred.resolve(ret);
      }
      function reject (value) {
        var ret = onError ? onError(value) : value;
        deferred.reject(ret);
      }
      observers.push({resolve: resolve, reject: reject});
      return deferred;
    }
    function resolve (value) {
    }
    function reject (value) {
    }
    return {
      then: then,
      resolve: resolve,
      reject: reject
    };
}
```
then 返回的是一个新 deferr 对象, 而 observers 保存的是包装过的函数，调用这个函数的时候会调用传的回调，并使用返回值调用新 deferred 的 resolve 方法。


再看下 resolve 和 reject，这次我们将所有的返回值都当成 derfer 来处理，然后调用 then 方法。不难理解下面这段代码：
```js
function resolve (value) {
  result = isPromise(value) ? value : {then : function (resolve) {resolve(value);}};
  while (observers.length) {
    var observer = observers.shift();
    result.then(observer.resolve, observer.reject);
  }
  observers = null;
}

function reject (value) {
  result = isPromise(value) ? value : {then : function (resolve, reject) {reject(value);}};
  while (observers.length) {
    var observer = observers.shift();
    result.then(observer.resolve, observer.reject);
  }
  observers = null;

  resolve({then: function (resolve, reject) {reject(value);}});
}
```
我们可能看到reject与resolve非常相像，可以完全用resolve替代，稍微改下：
```js
function reject (value) {
  resolve({then: function (resolve, reject) {reject(value);}});
}
```
该文章只是描述实现defer的思想，代码不能直接用，只是希望大家能一看就明白这个思路。

全部代码见<https://github.com/fedeoo/codebrick> firefox_raw_promise.js是firefox下的实现,比较具有参考意义。
