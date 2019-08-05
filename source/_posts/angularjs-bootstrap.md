---
title: "Angular启动"
date: 2014-10-31
category: 心得总结
tags: [AngularJS]
---

本来有一篇很好的文章讲解启动流程，后来设为秘密的了，虽然有复制，但也不太好拿人家不愿共享的东西出来。在这就贴一下我的总结啦。

<!-- more -->

## AngularJS加载完成后工作：

```js
  bindJQuery(); // 如果有JQuery

  publishExternalAPI(angular); // 暴露对外API

  jqLite(document).ready(function() {
    angularInit(document, bootstrap); //初始启动
  });

```

## publishExternalAPI

```js
publishExternalAPI:
  extendAngular() // 扩展bootstrap extend isArray...
  angularModule() // 定义angular.module
  module('ngLocale', []).provider('$locale', $localeProvider); //创建模块
  // 实际结果是 _invokeQueue.push('$provider', 'provider', arguments); _invokeQueue是模块实例的一个属性，自己在控制台输出下一个模块所有的属性。
  module('ng', ['ngLocale'], ['$provider', function ($provider){
      $provider.provider({
          $animate: $AnimateProvider,
          $browser: $BrowserProvider,
          $http: $HttpProvider,
          ......
      });
  }]);
  // 实际效果： _invokeQueue.push('$injector', 'invoke', arguments);
  // 为了批量添加，provider接收一个object
  module('app', []).controller('ctrl', function(){});
  // 实际效果： _invokeQueue.push('$controllerProvider', 'registre', arguments);
```

假设我们自己定义了一个 app 模块。

```js
app.run(['$scope', '$http', function ($scope, $http) {
}]);
// 实际先添加在_runblocks上
```
angularInit 做的事情是，查找页面上的 ng-app，启动整个应用。
doBootstrap 首先创建 injector，然后执行下面代码。

```js
injector.invoke(['$rootScope', '$rootElement', '$compile', '$injector', '$animate',
   function(scope, element, compile, injector, animate) {
     scope.$apply(function() {
        element.data('$injector', injector);
        compile(element)(scope);
     });
   }]
);
```

## 创建Injector的过程：

```js
doBootstrap-->createInjector(modules):
  //modules参数: ['ng', ['$provider', function () {$provide.value('$rootElement', element);}], 'App'];
  providerCache {$provider, $injector: providerInjector}
  providerInjector {get: 从providerCache中取}
  instanceCache
  instanceInjector

  loadModules: 递归加载Provider类，后加载的覆盖之前的。
    loadModules(moduleFn.requires)
    invoke(_invokeQueue) { // 大致操作
        ngLocale: $provider.provider('$locale', $localeProvider);
    }
    return _runBlocks.concat(reuqires._runBlocks);

  provider:每个应用注册的provider类全在providerCache中
    providerCache['$httpProvider'] = $httpProvider;
    providerCache['$filterProvider'] = $filterProvider;
    ......


  instanceInjector.invoke(['$rooScope', '$http', function ($rootScope, $http) {}]);

  instanceCache {$rootScope: ,$http: .....,Config} //获取$rootScope实例时，可能递归的创建了其他的实例。

```

每个应用只创建一个Injector，当然一个页面可以手动启动几个独立的app，好像还没人这么干。

从下面的代码中可以看到，一个app模块依赖的provider实例全在providerCache中，没错我说的就是xxProvider实例。

当我们定义一个provider时，我们知道它是包装过的一个函数

```js
    function XXXProvider() {this._get = function () {}}
```

这个 providerCache 中保存的就是该函数的实例 instance 它有一个 `_get` 属性。而 instanceCache 中保存的是调用`_get` 返回的实例。

一个 Injector 的实现并不复杂，cache 存放 provider 和实例，invoke 方法将函数提供的 $inject 或者参数名称 name 映射为 cache[name]，然后调用函数。

将 Provider 类和 Provider 实例分开单独的 cache 和 injector是基于这样的考虑：Provider 类不应该注入一个实例，同样实例不应该注入一个 Provider 类。

内部实现一个 createInternalInjector 方法提取共同部分创建这两个 injector。如果在 instanceCache 中查找不到，providerInjector 又有对应的 Provider 类，则会从 providerInjector 获取到该 Provider 类实例化一个。

至于模块的 config 方法，当然是与 Provider 类有关，而 run 方法当然是与 Provider 实例有关。就是

```js
//config(['xxProvider', function (xxProvider) {}])  在Provider类注入完之后才应该调用，所以保存在_configBlocks 而非 _invokeQueue中
providerInjector.invoke(['xxProvider', function (xxProvider) {}]);

// run(function (){})
instanceInjector.invoke(fn);
```

注册 directive 提供的的 directiveFactory 一般也不会被用到。注册的 Directive 有单独的 cache。$compile 的功能实现也不复杂，查找节点，以节点为参数调用对应 Directve 的 compile 方法。对每个节点都进行递归处理。
