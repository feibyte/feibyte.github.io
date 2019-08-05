---
title: "前端错误日志"
date: 2013-08-28
category: 积累
tags: [前端错误]
---

记录工作学习中遇到的问题，有些错误比较常见，有些错误花费了较长时间折腾。

<!-- more -->

### IE8以及以下split错误

+ 信息：IE8以及下无法获取属性“split”的值: 对象为 null 或未定义
+ 原因:['','','',]在定义的数组中最后一个元素后多了个','

### float:left左侧有空白
+ 信息:在chrome下，container中元素article，float:left左侧有空白，该article无margin\padding，父级元素container也无padding。
+ 原因:在container的上面元素header,内容过高，又没有设置overflow:hidden

### 包含块级元素div的同一行元素不对齐
+ 该行元素包括行级元素span ,同时包括了div设置了display:inline-block。
+ 原因:设置align;vertical

### flash调用js的sb问题
+ 信息:flash提供了一个接口，在视频播放的时候会调用JS的adplayerStatus方法。在测试过程中，如果单独的测试该方法是可以的。但是在系统中就是不调用该方法。
+ 原因:后面的监控模块重写了该方法。所以--！不过在监控处理：如果该方法已经定义，保存如一个变量，并在监控中调用该方法。

### 还是flash的事
+ 信息:在IE8下 flash无效果，一片空白。所以，开始的时候就一直查各个浏览器的flash嵌入代码是否有区别。
+ 原因:后来发现每个flash上面都有个mask，JS用来响应点击事件的。该mask的opacity:0在IE8下设置的不同。之前负责的人在css中写的是*filter:alpha(opacity:0)不明白为什么有这个*，这样在IE中就不是透明的，如果设置mask的background:transparent鼠标会点击到flash上。调了半天发现问题原因之后，真想说自己是个大**！

### widget中属性数据
在定义的一个widget中，new出的实例感觉共用一个数据属性。

```js
$.widget('pandora.Checkbox', **, {
	options:{
		w: 5,
		items: [{
			label: '',
			value: 0
		}]
	},
})
```
在每个实例出的操作的 w 是不同的，在操作 items 中元素时，多个 Checkbox 对象共用 items[0] 对象。
随便查看 widget 方法，就会看到第三个形参名称是 prototype。这也就说明了为什么是多个对象操作的是同一个对象。

### Jquery.ui.editable IE不能编辑
+ 如下代码，在 chrome下 双击能够进入编辑状态，IE 下不能编辑。debug 时发现双击会触发提交事件。默认的情况下 submitBy:blur。

代码如下：
```js
$dom.editable({
  editBy:"dblclick",
  type:"textarea",
  onSubmit:function(){
	}
});
```
调试代码发现：进入编辑状态后的绑定事件。$this执行了blur的事件处理。注释该方法IE8下可以编辑。
```js
$this.one(opts.submitBy, function () {
	opts.toNonEditable($(this), true);//注释该行IE8可以编辑。
}).
children().
one(opts.submitBy, function () {
	opts.toNonEditable($(this).parent(), true);
});
```
+ 问题：this 应该是一DIV 没有 blur事件，且也不应该触发。以后再看看了。

### grunt plugin async
创建 grunt 插件：<http://javascriptplayground.com/blog/2014/01/creating-your-first-grunt-plugin/>
<http://www.gruntjs.org/article/creating_tasks.html>

grunt 插件注册 task 中的异步事件不执行 `(setTimeout process.nextTick() setImmediate)`：必须
```js
var done = this.async();
setTimeout(function () {
	// Todo stub******
	done();
}, 0);
// node --debug-brk $(which grunt) task
```

### JS编码
又是一个值得刻碑立柱的错误，查了一下午，才发现 js 文件编码是 utf-8；只在 IE6 下冒出非常奇怪的错误。调试的时候 alert 信息，插入的 alert 没有弹出窗口，但是后面的广告渲染出来了。一直以为是 IE6 的什么奇葩 bug，却未注意到文件编码问题。

### IE人格分裂
时隔大半年，向别人描述的时候竟然描述错了。源文章在(IE 全局变量的人格分裂症)[http://hax.iteye.com/blog/349569]
bug原因：在两个不同的 js 中用两种方式声明全局变量。
```html
<script type="text/javascript">
  window['global'] = 'A';
</script>
<script type="text/javascript" src="out.js"></script>
var global = 'B';
```

之后你再获取 global 的值时，将会得到 undefined。大体是因为 JScript 引擎的设计与 IE DOM 对接的缺陷所导致。

### IE6 insertBefore appendChild

在往 Container 这个 Dom 中插入元素 ele 时，如果这个 Container 尚未完成加载。
Container.appendChild(ele) 或 Container.insertBefore(ele) 都会导致出错。IE6下显示 无法打开站点，已经终止操作 页面崩溃。

最常见的 container 是 body。文档没有加载完成就在后面追加，导致崩溃。插入 body 前面可以避免这个问题：
```body.insertBefore(ele, body.firstChild); ```
