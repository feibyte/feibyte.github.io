---
title: "也谈 JS 模块"
date: 2014-02-13
category: 造轮子
tags: [Module SeaJS]
---

跟大多数人一样，在最初接触JS时，没有考虑过模块的概念。当工作中前端做的事情越来越复杂，JS 越来越庞大，就必须好好考虑组织 JS 代码了。了解其它语言的人，可能会惊讶 JS 没有模块。当每个人都在做这件事情的时候，就不得不归咎到语言问题上了，或许在以后的规范中将加入对模块的支持。不过现在的我们还是有必要了解下怎么组织模块和懒加载的思想。

<!-- more -->

## 闭包和命名空间解决方案

当项目越来越复杂时，在项目开发中必须保证变量不冲突，当然最该考虑的就是约定，大家遵守同一个命名规范。不过总会用到别人的代码，外部代码就不一定遵从同一个规范了，为了避免变量冲突，最简单的处理，我们可以把代码包在一个匿名函数中。就像这样：
```js
(function () {
  //变量 函数
  var privateMember;
  function privateMethod () {
      //....
  }
})();
```
如果我们的其它模块需要访问该文件中的变量或函数，我们可以这样：
```js
var m1 = (function ($) {
  var privateMember;
  function privateMethod () {

  }
  return {
    publicMethod: privateMethod
  };
})(Jquery);
```
或者直接交给全局：
```js
(function (global, $) {
  //变量 函数
  var privateMember;
  function privateMethod () {
      //....
  }
  global.m1 = {

  };
})(global, Jquery);
```
将全局变量导入模块，作为局部变量解析速度更快。

使用模块模式，建立命名空间，假设项目名称：pandora；用户相关名称 pandora.user，可以这样约定命名规则。
```js
//代码出处：Javascript 模式
var pandora = pandora || {};
pandora.namespace = function (ns_string) {
  var parts = ns_string.split('.'),
    parent = pandora,
    i;

  if (parts[0] === "pandora") {
    parts = parts.slice(1);
  }

  for (i = 0; i < parts.length; i += 1) {
    if (typeof parent[parts[i]] === 'undefined') {
      parent[parts[i]] = {};
    }
    parent = parent[parts[i]];
  }
  return parent;
}

//使用
var moudle = pandora.namespace('utilities.array');
pandora.utilities.array = (function () {
  var privateVariable = {};
  function privateMethod () {
      //...
  }
  return {
    publicMethod: privateMethod
  };
})();
```
## 模块化编程

上面提到的是命名冲突，还有文件依赖问题。我们引入 Node.js 支持的模块编程，将上面代码改为模块的方式：
```js
//代码片段 003 math.js
define(function (require, exports) {
  //变量 函数
  var privateMember;
  function privateMethod () {
      //....
  }
  exports.publicMethod = privateMethod;
});

//在另一个模块中 net.js

define(function (require, exports) {
  var math = requeire('math');
  math.publicMethod();
});
```
Node.js 的模块系统就是这种方式，只不过不需要用户自己写define, node会对文件进行处理，Node.js 是服务端的应用当然可以这么写，而且读取文件依赖也是同步的。

## 同步模块实现

如果我们要在浏览器端实现上面提到的模块功能，应该解决哪些问题呢？

define 应该实现功能： 定义一个模块，模块 id 按照脚本 url 获取， 同时包括一个 function

require 应该实现功能：获取模块，返回的是模块中的 exports。

为避免重复，我们在全局变量 cacheMods 中保存加载的模块，并且保存 exports。
每个模块应该是这么一个对象：
```js
{
  id: uri,
  factory: function(require, exports){},
  exports: *** || {}
}
```
根据上面的分析：

define和require的功能伪代码大概是这样的
```js
function define (f) {
  var uri = getCurrentScriptUri(); //该uri是当前脚本路径
  var mod = new Module(uri, f);
  mod.exports = factory(require, mod.exports, mod);
  cacheMods[uri] = mod;
}

function require (uri) {
  var mod = cacheMods[uri];
  return mod.exports;
}
```

还有一个问题，当调用require的时候该模块还没加载怎么办？

先考虑如果是同步加载的话：我们可以这样子，加载该模块代码--简单的说就是插入一个script （src='uri'）当这个脚本加载完成后，执行define就有了这个模块。

上面的require代码也需要调整一下：
```js
function require (uri) {
  var mod = Module.get(uri);
  return mod.exports;
}
Module.get: function (uri) {
  var mod = cacheMods[uri];
  if (!mod) {
      var mod = new Moudule(uri);
      mod.load();
  }
  return mod;
}
```
好简单啊！不过load方法必须是同步的，必须检测到依赖的模块已加载完成后才能往下执行。

## 异步加载模块实现

如果我们要采用异步加载的方式，就不能在require时 加载依赖脚本。

在代码片段003我们也能看出，在define的时候，require是不会执行的。我们可以在define的时候指明模块依赖，在define的时候就把所依赖模块下载下来。模块也多了一个属性deps，表明所依赖的模块;

问题是这样强制用户指明依赖，是不是不太好。那我们自己来，分析下factory.toString()中的require ('');语句 获取到deps。

这下就简单多了，不过还没完，所依赖的所有模块加载完成后，应该告知模块。并标示该模块的状态。003中的math模块加载完成后应该通知net模块。现在我们的模块应该定义成这样：
```js
{
  id: uri,
  factory: function(require, exports){},
  exports: *** || {},
  deps: [],
  status: 0, //标识模块状态
  _awaiting: [], //等待该模块的模块队列
  _remain: deps.length //当前模块依赖的deps还有几个没加载
}
```
```js
//模块定义也变得复杂了点
function define (deps, factory) {
  var mod = cacheMods[uri] = new Module(uri, f, deps);
  mod._remain = deps.length;
  mod._awaiting = {};
  for (var i = deps.length - 1; i > 0; i--) {
      Module.get(deps[i]).load();
  }

  //如果依赖的模块都已加载完成调用onload
  if (loadedAlldeps) {
      mod.onload();
  }
}
function load () {
  var this;
  this.fetch();//在页面插入script 脚本加载之后又会调用define
}

function onload () {
  //检查 _awaiting 上阻塞的模块
  并对激活的模块 调用相应的 onload 方法
}
```
现在我们的模块应该差不多了。上面的 require 方法获取 mod 的 exports，如果多个地方调用 require('math'),也应该只有一个 exports，也就是每个模块的 factory 只执行那么一次。我们再稍微改下：
```js
function require (uri) {
  var mod = Module.get(uri);
  return mod.exec();
}
function exec () {
  return exports || mod.factory(require, mod.exports, mod);
}
```
启动执行第一个模块，我们的入口代码 只需要 `require('main')` 就可以了。等等，貌似哪里不对。main 模块这个时候还没加载啊。我们可以定义一个依赖 main 模块的 mod，加载这个
```js
var mod = new Module(['main']);
mod.onload = function() {
    mod.exec();
}
mod.load();
```
以上描述了 CMD 模块加载器 seajs 的大概实现。seajs 就不用介绍。在 seajs 中 define 是个全局的函数，而 require 是一局部的变量。在 define 的时候并不做加载操作。我们看下 seajs 整个的结构
```js
function Module(uri, deps) {
  //没有 factory
}
Module.prototype.load = function () {
  //加载依赖模块
  //没用下载的模块 调用fetch
}
Module.prototype.onload = function () {
  //模块加载完成后的回调，通知_awaiting上的模块，如果所有依赖也完成就调用它的onload
}
Module.prototype.fetch = function () {
  //下载脚本，脚本下载完成后回调 load
}
Module.prototype.exec = funcction () {
  //执行factory 得到exports
  function require(id) {
      return Module.get(require.resolve(id)).exec()
  }
}

Module.define = function (id, deps, factory) {
  parseDependencies();
}
Module.get = function (uri, deps) {
}
Module.use = function (ids, callback, uri) {
  //加载匿名模块
}
```
当然还是有不少差别的，上面我们实现的是简化了很多的。seajs引入模块：
```js
seajs.use("examples/hello/1.0.0/main");
```
如果懒得提供匿名模块加载方式，我们也能用类似的方式来启动第一个模块：
```js
var mod = seajs.cache['main'] = new seajs.Module('main' , ['examples/hello/1.0.0/main']);
mod.callback = function() {
  seajs.cache[seajs.resolve('examples/hello/1.0.0/main')].exec();
};
mod.load();
```
## 模块周边

大概或许就是这样，再来谈下文件合并的问题。CMD规范中一个文件只有一个模块，我们不能直接将所有模块连接到一个文件中。在seajs中定义的匿名模块是根据脚本的uri生成id的。在合并的时候必须指定该uri为id。即将原来的模块定义改成。
```js
//代码片段 003 math.js
define('main.js', [], function (require, exports) {
});
```
seajs文件的合并是用spm-js做的。

最后，提下 smash，d3 用到的一个文件拆分的处理方式。在 JS 中可以这么用

```js
import "math"
```

在运行前重新生成合并文件。主要是用 namespace 避免污染变量，这样的好处就是实际生成的 JS 还是原来的 JS 代码，但是在开发的时候各个文件很小，在开发的时候感觉更为清晰些（我们的一个项目中有用过这东东）。
