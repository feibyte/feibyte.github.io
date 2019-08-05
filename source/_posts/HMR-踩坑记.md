---
title: HMR 踩坑记
date: 2017-06-25 19:44:55
tags: [webpack]
---

昨天遇到一个问题：使用 next/tree 时报错，即使最简单的 Demo 也会报错，而官网提供的则不会，最终问题定位到 react-hot-loader 上。我使用的是 `react-hot-loader@next`版本，需要在 babel 配置中引入 `react-hot-loader/babel` plugin。禁用这个 plugin 正常渲染，启用就报错，这个问题太诡异了，所以有必要搞清楚 HMR。

<!-- more -->

## 了解 HMR
热替换是 webpack 的很炫酷的特性，简直就是黑魔法般的存在。其实原理很简单，见下图（一直觉得别人画的图很厉害，虽然经常看不懂）：

![1-DoOmboEYHv0sgSjaOWo0Qw.png](https://private-alipayobjects.alipay.com/alipay-rmsdeploy-image/skylark/png/9206/00ab9c94b132c43f.png)

webpack-dev-server 服务启动之后与 webpack 建立连接，本地发生变化通知 webpack-dev-server，页面注入 devServerClient.js 脚本保持与 webpack-dev-server 通信。本地发生变化之后，通知浏览器，浏览器拉取最新的变化模块。

浏览器端维护着一个 `modules: {}` 集合，当某一个模块变更时，我们需要重新执行该模块，缓存模块对象。接下来就是如何重新渲染页面了，我们应该都见过下面这段代码。

```js
if (module.hot) {
	module.hot.accept('./App', () => {
	   // ...
	   render();
	});
}
```

这段代码可以理解问监听模块变化，重新渲染页面。得益于消息冒泡，我们只需要监听最顶层的模块就可以了。重新渲染页面，对于 React 应用来说可以用这种方式：

```js
const render = () => {
  const nextApp = require('./App').default;
  // ...
};
setTimeout(() => {
  ReactDOM.unmountComponentAtNode(MOUNT_NODE);
  render();
));
```

[react-redux-starter-kit](https://github.com/davezuko/react-redux-starter-kit) 就是这种方式。
对于样式文件，[sytle-loader](https://github.com/webpack-contrib/style-loader) 替我们做了热替换。我们在代码中引入样式文件：
```
import './Demo.css'
```

实际上是这样的：
![style-loader--css.png](https://private-alipayobjects.alipay.com/alipay-rmsdeploy-image/skylark/png/9206/9cb750c1f6292c5a.png)

## 热替换更顺滑
大多数的项目示例都是上面这种形式重新渲染页面，用户并不会体会到页面重刷的感觉。不过如果组件有自己的内部状态，这个状态肯定会丢失。为了将替换体验做的更顺滑，Dan Abramov 开发了 [React Hot Loader](https://github.com/gaearon/react-hot-loader) 可以让更新组件时内部状态不丢失。[react-proxy](https://github.com/gaearon/react-proxy) 会包装每个组件类，组件发生变化，只是实例原型上的方法改变，并不影响组件实例本身，只不过再次执行的是新的方法。

了解了这点之后，再检查下 next/tree 的代码就会发现，在 TreeNode 组件中包含有这样的代码逻辑：
`item.type === TreeNode` 或者 `children.type === TreeNode` 来检查如果 children 是否是 TreeNode 类型。现在因为 `react-proxy` 包装了原来的组件类， children.type 类型其实是 ProxyComponent，虽然有着相同的属性和原型链，但其实是完全不同的对象，所以 `children.type === TreeNode` 结果就是 false。解决方法：我们在需要比较组件类型时，可以比较该类上的一个标识，或者比较原型链来绕过这个坑。

另外还有一点值得提下，HMR 的粒度是模块，因此如果在一个模块文件中创建几个类，其实里面的类型是不会被代理的。也就享受不到 `react-hot-loader` 带来的好处。

## react-hot-loader 应用情况
`react-hot-loader` beta 版本发布了很长时间，并未见到流行项目中用到，[create-react-app](https://github.com/facebookincubator/create-react-app)，
[react-redux-starter-kit](https://github.com/davezuko/react-redux-starter-kit)，[dva](https://github.com/dvajs/dva)， [react-boilerplate](https://github.com/react-boilerplate/react-boilerplate)。如果项目中用 redux 来管理 store，组件很少维护数据状态，确实这个特性并没那么大的吸引力。


相关文章：
1. [探究Webpack中的HMR(hot module replacement)](https://blog.oyyd.net/post/how_does_react_hot_loader_works)
2. [React Native 热加载（Hot Reload）原理简介](http://www.tuicool.com/articles/myYzmqB)
3. [Webpack & The Hot Module Replacement](https://medium.com/@rajaraodv/webpack-hot-module-replacement-hmr-e756a726a07)
4. [Webpack’s HMR & React-Hot-Loader — The Missing Manual](https://medium.com/@rajaraodv/webpacks-hmr-react-hot-loader-the-missing-manual-232336dc0d96)
