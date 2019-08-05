---
title: "AngularJS中的懒加载【翻译】"
date: 2014-11-01
category: 翻译
tags: [AngularJS lazyload]
---

> 原文 [Lazy Loading In AngularJS](http://ify.io/lazy-loading-in-angularjs/)

当我们使用 AngularJS 构建一个包含许多路由/视图的大型应用的时候，我们希望在最初加载的时，最好不加载所有的 artefacts，像 controller、directive 之类。理想情况下，最初加载时只加载必需的模块。之后用户改变路由，加载尚未加载的所需模块。这样做的好处不仅会加快页面初次加载速度，而且会节约带宽。这篇文章就介绍了在 AngularJS 架构的应用中如何懒加载 artefacts。

<!-- more -->

为了实现懒加载 controller 和 directives，首先需要弄清两个问题：

1. 在应用启动之后，如何注册这些 artefacts

2. 什么时候加载这些脚本

第一个问题是因为在应用启动后，不能使用模块 API 注册 artefacts。换句话说，如果我们尝试在已经启动的应用中使用下面的方式注册一个 controller:

```js
  angular.module('app').controller('SomeLazyController', function($scope) {
      $scope.key = '...';
  });
```

当你使用 `ng-controller` 指令引用到这个 controller 时，将会出现下面的错误提示：

`Error: Argument ‘SomeLazyController’ is not a function, got undefined`

这时，在一个已经启动的应用中唯一注册 artefacts 的方式不是使用模块 API，而是使用 Angular provider。Providers 往往用来创建和配置 artefacts 的实例。因此为了注册一个 provider，你应该使用 $controllerProvider。同样，使用 $compileProvider 来注册 directive，使用 $filterProvider 注册 filter，使用 $provider 来注册服务。注册 controller 和 directive 的代码大概是这样的：

```js
// Registering a controller after app bootstrap
$controllerProvider.register('SomeLazyController', function($scope) {
  $scope.key = '...';
});

// Registering a directive after app bootstrap
$compileProvider.directive('SomeLazyDirective', function() {
  return {
    restrict: 'A',
    templateUrl: 'templates/some-lazy-directive.html'
  }
})
// etc
```

provider 只有在模块配置的时候可用，因此你需要保存一个引用，这样子就可以注册一个 artefact。类似于下面的方式：

```js
(function() {
  var app = angular.module('app', []);

  app.config(function($routeProvider, $controllerProvider, $compileProvider, $filterProvider, $provide) {
    app.controllerProvider = $controllerProvider;
    app.compileProvider    = $compileProvider;
    app.routeProvider      = $routeProvider;
    app.filterProvider     = $filterProvider;
    app.provide            = $provide;
    // Register routes with the $routeProvider
  });
})();
```

你就可以用这种方式注册controller：
```js  
  angular.module('app').controllerProvider.resgister('SomeLazyController', function($scope) {
      $scope.key = '...';
  });
```
还有另外一个问题，什么时候加载上面的脚本呢？在 route 的 resolve 属性中可以做到。

使用 $routeProvider 时，你可以指定一个可选的 key/factory 依赖表，这个会注入到 rotute controller 中，依赖表使用 resolve 指定如下：

```js
$routeProvider.when('/about', {
  templateUrl:'views/about.html',
  controller:'AboutViewController',
  resolve:{ key: factory }
});
```

依赖表中的 key 作为依赖的 name，factory 要么是一个字符串，要么是一个函数。字符串作为服务的别名，函数使用返回值。如果函数返回的是 Promise，这个 Promise 在 route 开始渲染之前完成 resolved。这样我们就可以在依赖表中的函数中返回一个加载脚本的 Promise，保证在 route 开始渲染之前加载所依赖脚本。下面的例子中使用 $script 完成脚本加载：

```js
$routeProvider.when('/about', {
  templateUrl:'views/about.html',
  resolve:{
    deps: function($q, $rootScope) {
    var deferred = $q.defer();
    var dependencies = [
      'controllers/AboutViewController.js',
      'directives/some-directive.js'
    ];
    // Load the dependencies
    $script(dependencies, function() {
      // all dependencies have now been loaded by so resolve the promise
      $rootScope.$apply(function() {
          deferred.resolve();
      });
    });
    return deferred.promise;
}}});
```

唯一需要注意的是promise的resolve很可能需要在AngularJS的环境中执行，像上面那样。可以使用$rootScope的$apply方法实现。如果不这样做的话，在页面完成加载时route不会开始渲染。

现在模块定义看起来像下面这样：

```js
(function() {
    var app = angular.module('app', []);

    app.config(function($routeProvider, $controllerProvider, $compileProvider, $filterProvider, $provide) {
        app.controllerProvider = $controllerProvider;
        app.compileProvider    = $compileProvider;
        app.routeProvider      = $routeProvider;
        app.filterProvider     = $filterProvider;
        app.provide            = $provide;

        // Register routes with the $routeProvider
        $routeProvider.when('/', { templateUrl:'views/home.html' });
        $routeProvider.when('/about', {
          templateUrl:'views/about.html',
          resolve:{
            deps: function($q, $rootScope) {
              var deferred = $q.defer();
              var dependencies = [
                'controllers/AboutViewController.js',
                'directives/some-directive.js'
              ];

              $script(dependencies, function() {
                // all dependencies have now been loaded by $script.js so resolve the promise
                $rootScope.$apply(function() {
                    deferred.resolve();
                });
              });

            return deferred.promise;
        }}});
    });
})();
```

最后，你可以用下面的方式启动应用：
```js
    // This file will be loaded from index.html
    $script(['appModule.js'], function() {
        angular.bootstrap(document, ['app'])
    });
```
以上就是实现懒加载的大概步骤。总之，首先在定义你的 app 模块时，保存相关 provider 实例的引用。然后你应该使用它们注册你自己的 artefacts，之后在定义 route 时，使用resolve返回一个 promise，在其中加载所需的脚本，完成之后 resolve promise，不要忘了在 $rootScope.$apply 里面。最后，加载完主模块后，你应该手动启动应用。

***

### 翻译之外

可以看下 angular-lazyload，一样的思路!

也有反对的声音：不过并不提倡这种 hack 的方式，因为不符合 Angular 的设计思想。 Angular 将配置和执行独立分开，在配置块之外禁用 providers。
这样做可能会导致 bug 和不可预期的结果，因为 AngularJS 在 injdector 创建之后并不期望再去注册 controller 和 directive。
当然懒加载是一个很好的想法，不过我们应该等待框架支持而不是用 hack 的方式实现。在 AngularJS 2.0 中将支持这一特性。

之前在介绍启动的时候提过[Angular启动](http://fedeoo.github.io/%E7%BF%BB%E8%AF%91/2014/11/03/angular-bootstrap/)：

在使用 module 的 api 时，并木有直接注册 controller，而是丢在了 `_invokeQueue中`。启动的时候，从队列中取出，完成加载：
```js
  $controllerProvidre.register('controllerName', function () {});
```
