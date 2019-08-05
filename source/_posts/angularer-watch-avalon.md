---
title: "初看 avalon"
date: 2015-04-23
category: 心得总结
tags: [调研 MVVM]
---

> 因为需要考虑兼容低版本浏览器，想选择一个更为合适的MVVM框架，需要调研下 avalon，从一个 angular 使用者角度看 avalon（有排斥心理）。

<!-- more -->

### MVVM
首先是 MVVM，MVVM 方式的实现中，如何监测数据发生变化是一个问题。angular 实际并没有监听数据变化，在使用 angular 时改变 `$scope` 上数据，能够立即看到效果，原因是你修改数据的地方都是 angular 提供的，在 `controller` 内部、`$http` 回调以及 `$timeout` 回调，在你修改数据之后，angular 调用了一次`$digest`，所以数据能够发生变化，这也是为什么不建议你用 `$.ajax` 、`settimetout` 的原因。另外，众所周知 angular 脏检测效率低下，假设一个数据发生变化，需要调用相关的处理函数。在处理函数执行完成之后有可能再次引起数据变化，所以就需要再次检测....
在这方面 avalon 用 hack 的方式，直接监测数据变化。

avalon 在 vm 上加入 getter setter watch数据变化。对于复杂 model 对象 `vm.options.colsdef` 最里层的变化就需要你自己监测了。

```js
// avalon 形如以下方式：
vm.options.$watch('colsdef', function () {})
// 当然 如果你对 options 添加新的属性，就....
```
如果浏览器都支持 Object.observe 的话，MVVM也没这么折腾了。

ms-duplex 等同于 ng-model  avalon 加入 `data-duplex-observe="false"` 来禁止双向同步。 虽然在 ms-duplex 2.0 引入 ms-duplex-string、 ms-duplex-number、 ms-duplex-boolean、 ms-duplex-checked 取代原来的 ms-duplex-text、ms-duplex-bool、 ms-duplex-radio。感觉这些东西不是经过良好设计加入进来，而是为了解决现成的问题引入进来。angular 中的 ng-model提供的 `$parsers`（view 经该 pipeline 解析数据）  `$formatter`（model 数据经该 pipeline 格式化显示）更给力。当然ms-duplex 在内部实现上也有一个 pipe 做数据适配过滤的。


### 指令
avalon 在设计时考虑兼容性，抛弃了自定义标签。所有的标签都是由框架提供，也是下面的一些短板。
不够优雅之处：
1. ms-click-1，ms-click-2，ms-click-3 表示可以为某一个元素绑定 N 个点击事件。或许一般人也不会这么来做，完全可以在一个事件绑定中处理完这些事情。但是 ms-class-1 ms-class-2 可能是经常用到的。angular的写法 `ng-class="{strike: deleted, bold: important, red: error}"`。
2. 指令存在优先级 这个是神马 虽说对用户透明。但是还是引入了 ms-if-loop。

### 组件：
没有了自定义标签，在组件化上就弱了很多。

```html
<!-- avalon写法：跟现在的组件写法差不多 -->
<div ms-widget="accordion, accordionId, accordionOpts"></div>
<!-- angular写法 -->
<accordion options=""></accordion>
```

另外，不知道全局配置在 `avalon `如何实现。比如对项目下所有的 `pager` 设置默认配置。

### 路由

`mm-router` 虽说敢叫板 `ng-router`，但是跟 `ui-router` 比还是差很远。在权限验证和二级路由上，不知道怎么做的，还没深入使用。

```js
// avalon
avalon.router.get("/ddd/{dddID}/", callback)

// angular ui-router
$stateProvider.state('adnav', {
  url: '',
  controller: 'AdnavCtrl',
  templateUrl: 'business/adnav.html',
  resolve: // 权限验证
})
```

### 小结

avalon 宣称是一个迷你易用的 MVVM 框架，从文档上看，avalon 主要精力都在MVVM方面。除了 MVVM，angular 的依赖注入也是很不错的特性，尤其是。自定义标签可以在组件化上做很多事情。路由不及 ui-router 强大。组件化在当前的开发中，可以说是一种共识，React的流行就能看出。emberJs 也在做，虽说跟angular一样强依赖于框架。
