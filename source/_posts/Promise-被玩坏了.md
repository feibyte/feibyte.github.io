---
title: Promise 被玩坏了
date: 2017-01-19 11:31:30
tags: ["Promise", "MutationObserver"]
---

收到产品同学反馈的一个 bug：在 iOS 上，进入首页之后很快滑动，再点击切换到第二个页面会一直处于loading状态，可以稳定复现。拿自己的手机试了几次果然可以复现。在模拟器上准备调试，打开控制台并未看到错误。于是猜想有异常没有处理，检查代码是否遗漏：
```javascript
showLoading();
fetch(url).then(() => {}, () => ([])).then(() => {
  hideLoading();
});
```

<!-- more -->

对这段逻辑还是不放心，手动在 fetch 之后的 `onsuccess`，`onerror` 中打印调试信息，发现两个方法都没有调用。因为 Safari 不支持 fetch，开始怀疑引用的 fetch 有问题，加上调试信息：

```javascript
self.fetch = function (input, init) {
  return new Promise(function (resolve, reject) {
    var xhr = new XMLHttpRequest();
    // ...省略部分代码
    xhr.onload = function() {
      // ...
      console.log('--------->', input);
      resolve(new Response(body, options))
    };
    // ...省略部分代码
  });
};
```
一切正常 resolve 响应内容，但是就是不处理之后的 then 方法。手动在控制台敲：
```javascript
new Promise(resovle => { resovle('haha'); }).then(data => { console.log(data); }, () => { console.log('wwwwwww'); })
```
不打印任何结果。检查 Promise 确认是原生对象
```javascript
Promise
// function Promise() { [native code] }
```
之前看过的 Promise 实现是基于 setTimeout 实现，再测 setTimeout 是否正常
```javascript
setTimeout(() => {
  console.log('it works');
}, 10);
```
结果正常工作。既然是 Promise 有问题，就把原来的注释掉，换用 core-js 的实现，虽然 bug 照样复现，但好歹我们可以调试了。再次执行上面测试 Promise 的代码，发现 Promise 交给 mocrotask 执行时，压根未执行。关键代码：
```javascript
var Observer  = window.MutationObserver || window.WebKitMutationObserver;
module.exports = function(){
  var head, last, notify;
  var flush = function(){
    var parent, fn;
    console.log('<---- flush');
    while(head){
      fn   = head.fn;
      head = head.next;
      try {
        fn();
      } catch(e){
        if(head)notify();
        else last = undefined;
        throw e;
      }
    } last = undefined;
    if(parent)parent.enter();
  };

    var toggle = true
      , node   = document.createTextNode('');
    new Observer(flush).observe(node, {characterData: true}); // eslint-disable-line no-new
    notify = function(){
      console.log('notify---->');
      node.data = toggle = !toggle;
    };

  return function(fn){
    var task = {fn: fn, next: undefined};
    if(last)last.next = task;
    if(!head){
      head = task;
      notify();
    } last = task;
  };
};
```
调试发现不知名的原因导致 head 不为空，追加任务只能追加在队列后面。手动调 flush 一下就会发现之前所有的未执行的任务都完成了处理。现在的问题就停留在是什么原因导致的 head 不为空。按说上面的代码确保队列里的任务最终都被处理， notify 之后都会触发 flush （注意不是说每个 notify 都会触发 flush，可能多个 notify 触发一次 flush ）。添加调试信息发现，某些情况下根本没有触发 flush，导致任务阻塞，Promise 被玩坏。

查看了其它 Promise （bluebird 以及 ES-promise）的实现，如果支持 MutationObserver 都会使用 MutationObserver，不支持才会降级到 setTimeout 。有人提示 Vue 的异步队列也用到了这个方案。

如何复现这种情况，调试时排除了路由的原因，只要在加载的时候滚动就会出现不触发 flush 的情况。尝试做了一个 demo 但是未能复现，google 了一下也未搜到 MutationObserver 相关 bug，只有一个类似 [issues](https://github.com/petkaantonov/bluebird/issues/666) 。

当然禁用 MutationObserver 可以绕过这个问题。

如何验证这个问题，iOS 10.2 上（低版本 setTimeout 没有这个问题），对请求比较多的页面，未加载完成时就疯狂操作，争取能够稳定复现。
