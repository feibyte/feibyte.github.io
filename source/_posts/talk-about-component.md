---
title: "谈谈组件封装"
date: 2015-05-14
category: 总结
tags: [组件]
---

在前端开发中，我们往往会定义自己的组件，比如常见的日期选择器 `datepicker`，在其它页面上需要使用时再实例化一个组件。本文简单地聊下组件封装。首先会说下基于 jquery 的封装，之后会以 angular 为例，简单说下框架与组件的适配。最后说说 `web components` 标准。

<!-- more -->

### jquery 类组件

封装一个组件，往往需要提供的方法有

 - init： 负责构造组件 DOM 结构，之后会做一些事件绑定。这个接口往往还会接受一个options类的配置数据。
 - render： 根据状态数据渲染组件。往往是重绘模板。
 - onchange： 对外暴露一些事件。
 - setValue：改变内部数据接口，重绘最简单的方式就是再次 render。
 - destroy: 处理组件销毁工作，比如 unbind event。

然后像下面这样实例化一个组件（假设是 jquery widget）。

``` js
$('ele').datepicker({...});
```

不过，很多时候我们不想手动去实例化一个组件。我们觉得下面这种写法更符合 web 语义。

```html
<div data-role="date-picker">....</div>

<date-picker onchange='****'></date-picker>
```

如果我们使用一些配套的框架，往往也会支持这种写法（如 Bootstrap...）。在 DOM 加载完成之后，扫描所有节点，对支持组件的节点，调用对应的组件构造方法。如果在框架加载处理完成之后，自己手动插入组件节点，是不会生效的，往往还需要手动 init，销毁时的还要手动销毁。
通常所有的组件还会继承自一个 BaseComponent，该 BaseComponent提供一些公共的方法。

### angular.js 1.× 中的 directive

directive 是 angular 的三大特性(`mvvm`，`依赖注入`，`directive`)之一。 angular 在 do-bootstrap 之后，最后会编译根节点并 link 到 rootScope 上。

```js
compile(rootElement)(rootScope)
```

简化再简化版伪代码描述：

```js
function compile ($compileNodes) {
  return compileNodes($compileNodes);
}
function compileNodes ($compileNodes) {
  _.forEach($compileNodes, function (node) {
    var directives = collectDirectives(node);
    applyDirectivesToNode(directives, node);
    // 递归compile子元素
    compileNodes(node.childNodes);
  });
}
function collectDirectives (node) {
  var directives = [];
  // 查找 nodeName attributesName className 中的directive 并加入directives
  ...
  return directives;
}

function applyDirectivesToNode (directives, node) {
  // 以node为参数调用所有diretives的compile方法
  _.forEach(directives, function (directive) {
      directive.compile(node);
  });
}
```

link 与 compile 对应但又分开。考虑 `ng-repeat` 这样的 directive， 只需要一次 compile，而 link 次数就不确定了。
还有很多需要考虑的，如 scope 层级、独立 scope、属性上的双向绑定....


### react.js
> 对 react 不熟，就看看吧。

简单的组件 React 写法看上去没有什么不同。看上去好像也是提供一个模板，数据变化时重新渲染。代码中的标签写法是 jsx 语法，实际会处理成 reactElement。

```js
var XXXComponent = React.creatClass({
  render: function () {
    return (
      <div>
      // 根据props state数据填充 ....
      </div>
    );
  }
});
React.render(<XXXComponent>, element);
```

每次都重新渲染的方式，有点太过简单暴力。虽说性能可能会有影响，但是开发者完全不需要关注数据变化是怎么改变组件（之前可能会介绍选择局部重绘）。react 引入的 virtual DOM 使得重绘非常高效（传说这样子），就更不用担心。
> 如果根据react的diff算法设计场景故意让重绘效率降低

表单验证这方面就不如 angular 的写法优雅。假如对一个 Input 添加一个新的验证，React 就必须用一个采用 Wrap 的方式，当然也可以重写一个 Input 支持 xxx 属性。


```html
<!-- react 写法 -->
<XXXValidator>
    <Input/>
</XXXValidator>
<!-- angular 写法 -->
<input xxx-validator />
```

### web components

上面讨论的做法不管怎样封装，实际 DOM 结构都会暴露在外，而且样式冲突防不胜防。而 `web components` 提供的 `shadow DOM` 做到了完全隔离组件。比如现在很常见的 range 组件，对外看起来就是只有一个元素，遍历时也获取不到 range 中的子元素，而且外部的样式也不会影响到组件。
```html
<input type="range">
```

<input type="range">

考虑到确实有这样的场景，需要自定义组件样式，需要自定义组件内容，如 Dialog 这种。`shadow DOM` 提供了通透的那部分对外又是可见的。使用伪元素选择器又能改变组件样式。

> 前年有翻译规范的打算。后来读的时候不能完全明白，实在翻译不下去了...

### 小结

整篇文章先说常规的组件封装。再谈语义化更为明确的 direactive，只说了框架与组件的适配，中间插入最近比较火的 react 组件，最后以 `web components` 标准结束。
最后还想说下基础组件与业务组件，基础组件一般不会变化。做一个项目时，有时发现几个功能类似需求出现在几个地方，封装成一个组件。过段时间需求变更，其中一个地方需要加新功能...。这么来几次，一个业务组件很容易被玩坏。业务组件如何复用是一个麻烦的问题。
