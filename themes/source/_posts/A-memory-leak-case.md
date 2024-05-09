---
title: 一个内存泄漏问题分析
date: 2019-08-11 15:03:01
categories: ["实践总结"]
tags: 调试
thumbnail: /gallery/thumbnails/memory-leak.jpg
---

一般来说，借助于强大的 GC 和 lint 工具，前端还是很少会碰到内存泄漏问题的。这篇文章说下我最近遇到的例子以及排查的过程。

内存泄漏的检测还是非常容易的：打开 `Chrome DevTools` 选择 `Memory` 选项，点击 `Take heap snapshot` 等待查看内存大小。重复这个步骤，如果你发现内存大小定期增长，或者增长的很有规律，那么八成出现内存泄漏了。这个是 Google 的 [文档](https://developers.google.com/web/tools/chrome-devtools/memory-problems/)


## 问题检测
我们的应用是这样组织的，采用微前端架构，涉及到几个项目，一个 Shell 负责管理具体渲染哪个页面，应用默认是 Documents 页面，还有一个 Teams 页面分别属于不同的项目。 在 Teams 页面采集内存信息，回到 Documents 页面等待页面加载完成再回到 Teams 页面再次采集内存信息。重复这个过程几次，这是结果截图。为了确保数据准确，在隐私窗口测试以免受插件影响，在每次收集之前都点击 `Collect Garbage`。每次都多次采集直到得到 4 个相同的值表示内存大小稳定。这个截图上，5，6，7与8相同就移除了，不过足以说明应用确实存在内存泄漏了。

<img src="/gallery/site/memory-snapshot.png" alt="memory snapshot" style="width:200px;display:block; margin: auto;"/>

## 问题诊断

现在我们知道有内存泄漏，先比较下 Snapshot 19 和 Snapshot 15 的内存信息. 😱 好吧, 太多对象了，几乎是组件树上的所有示例都有在列，毫无头绪。因为涉及到三个项目，完全不知道如何下手。不过不管怎样，先从可以做的做起，先把开发环境准备好。当然开发环境本身就有更多干扰因素，不过好歹还是有了第一条线索。当我尝试复现问题时，根本不等 Documents 页面完成渲染就切换页面，控制台有一个警告信息：

> Warning: Can't perform a React state update on an unmounted component. This is a no-op, but it indicates a memory leak in your application. To fix, cancel all subscriptions and asynchronous tasks in the componentWillUnmount method.
 
因为有错误堆栈信息，所以很快发现，这个错误时因为没有清理定时器导致的。虽说本书是有逻辑来清理定时器的，但是没有考虑到这些逻辑因为用户页面跳转中断。所以说最好还是在 `componentWillUnmount` 完成所有的清理工作。

修复这个问题并且排查了所有的定时器之后，发现内存泄漏还在，看起来没那么容易解决。

为了方便问题排查，先修改 Teams 为仅渲染普通文本，依然稳定复现内存泄漏。不过其次最为可疑的就是全局的事件监听，排查一遍发现有些监听未被移除。幸运的是，发现一个低级错误，本来 `componentWillUnmount` 应该移除监听结果又添加了一遍：.
```js
componentDidMount() {
  window.matchMedia('print').addListener(this.printHandler);
}
componentWillUnmount() {
  window.matchMedia('print').addListener(this.printHandler);
}
```
把 addListener 改为 removeListener 之后重新检查一遍，发现还是存在内存泄漏。
 
检查了所有的事件监听之后，确信没有遗漏，在查看内存信息的时候看到 onLoad 事件回调，对了，on 事件给漏了。在 shell 里一些可疑代码：
```js
const tag = document.createElement('script');
// ... some code
tag.onload = () => {
  resolve();
};
// ...
document.body.appendChild(tag);
```
不管怎样，我们应该清理到这些事件： 

```js
tag.onerror = () {
  tag.onload = tag.onerror = null;
};
tag.onload = () {
  tag.onload = tag.onerror = null;
};
```
重新检查内存泄漏，发现还是存在。上面的代码因为只允许了一次所以不会导致内存大小变化。这个时候都怀疑是不是第三方库的原因了。不过还是当把 Documents 页面换成普通文本时发现，没有问题了。所以问题肯定在 Documents 组件上。 为了进一步缩小范围，试着把 render 方法移除，发现问题这样都有问题。 所以说，问题还是在 `componentDidMount` 和 `componentDidMount` 上的事件监听上. 但是看起来一切正常。 因为对 `matchMedia` 这个实验特性不熟，又再次查看了下文档. 这次注意到：它说每次都会返回一个新的对象 ...  

意思就是 `matchMedia('print') !== matchMedia('print')` 这也就是为什么 `matchMedia('print').removeListener(this.printHandler); ` 压根没有的原因。修复这个问题之后，再次检查就没有内存泄漏的问题了。

## 总结
内存泄漏很少碰到，当然也很难调试犹如大海捞针。 除了排查定位：定时器，全局的事件监听，以及全局对象是优先排查的对象。

