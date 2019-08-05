---
title: "阅读文章记录"
date: 2013-10-10
category: 积累
tags: [阅读笔记]
---
读别人的博文的时候，觉得好的，有时会收藏。觉得不对的地方也记录一下。

<!-- more -->

## jquery-原理-机制

文章出处：<http://www.zhangxinxu.com/wordpress/2013/07/jquery-%E5%8E%9F%E7%90%86-%E6%9C%BA%E5%88%B6/>
```js
var F = function(id) {
    this.element = document.getElementById(id);
};
F.prototype.hide = function() {
    this.element.style.display = "none";
};
new F("image").hide();
```
作者说这种方式将 element 暴露给了 var f = new F() 对象。很明显我们可以这样访问 `f.elemen` 或者 `f.hasOwnProperty('element')`。作者在第五步给出了隐藏的方案：
```js
var F = function(id) {
    return this.getElementById(id);
};
F.prototype.getElementById = function(id) {
    this.element = document.getElementById(id);
    return this;
};
F.prototype.hide = function() {
    this.element.style.display = "none";
};
new F("image").hide();
```
同样有人质疑：f 对象一样有 element 属性。作者的解释是：第 5 条的 element 不是在包装器对象本身上，而是在原型上。
而我认为是没区别的，打印 f，也能看到 f 是有 element 属性的。在原型上是什么意思？`f.__proto__` 上？那 `var f1 = new F('f1');` 与 `var f2 = new F('f2');` f1与 f2 岂不是共用 element ？所以也不是第九给出的原型结构那样。其实结果是一样的，这样写的真正目的是不用 new 也要返回一个对象。就如下面的结果：不管是用 new $('').each() 还是$('').each()都可以。最后的代码：
```js
var $ = function(selector, context){
  return this.init(selector, context);
};
$.fn = $.prototype;
$.fn.init = function(selector, context){
  return this;
};
$.fn.each = function(){
}
```
## reflow rerender浏览器原理

浏览器内部工作原理：<http://www.kb.cnblogs.com/page/129756/>   
在比较多的文章中(<http://my.oschina.net/u/1162598/blog/158823>)指出：合并样式操作减少回流。  
但是记得在之前的 js 线程分析中说：js 是单线程的，所以在当前的js执行完后才会执行渲染线程。那合并不合并的是不是也就无所谓了。或者说每次的样式操作都会加入到一个渲染队列，在执行渲染线程的时候依次从队列执行。如果是这样，合并样式确实有用。当然也有文章说是每次样式操作加入到一个队列中，那这样子，浏览器渲染的时候肯定是进行优化的。一篇文章中提了读写的顺序，将操作顺序改变：rwrw ==> rrww。渲染线程是个单独的线程。

### 关于jshint有话说

loopfunc 检测代码中循环中包含 function 定义的。确实如果在一个循环中定义 function，so weird! 但是 js 没有块作用域，所以这样做意义感觉不大。
<http://www.cnblogs.com/TomXu/archive/2011/12/29/2290308.html>
在重新读了函数声明和函数表达式后，函数声明不应该出现在块中。

### 属性操作IE问题

setAttribute .属性操作 IE 问题 <http://w3help.org/zh-cn/causes/SD9006>

`jquery $.prop()` 与 `$.attr()` 如果设置 checked 这类应该使用 prop，attr 不再支持。
