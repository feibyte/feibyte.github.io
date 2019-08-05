---
title: "es6 函数初始化绑定"
date: 2016-02-28
category: 心得总结
tags: []
---

最近在看 [es6](https://leanpub.com/understandinges6/read) ，拿 [quiz-es6](http://perfectionkills.com/javascript-quiz-es6/) 做测试。第一道题是关于函数初始化绑定的。

<!-- more -->

```javascript
(function(x, f = () => x) {
  var x;
  var y = x;
  x = 2;
  return [x, y, f()];
})(1)
// [2, 1, 1]
```

为了搞明白这段代码，看下规范中的描述。

为了解释这段代码的执行结果，我们从 函数对象 F 的 [[Call]] 内部方法说起。F.[[Call]] 接收两个参数 thisArgument 和 argumentsList，它的执行步骤如下（简单描述）：  

1.  准备环境
2.  绑定this
3.  执行 OrdinaryCallEvaluateBody(F, argumentsList)
4.  恢复环境

上面步骤中的第三步又会执行 FunctionDeclarationInstantiation(F, argumentsList) 来进行函数声明初始化。这里的步骤很多（详见规范 9.2.12），简单描述下（忽略参数有重复情况）：   

1. 首先，将所有的函数（Function and Generator）声明 收集到 functionsToInitialize 。如果有多个同名函数，采用最后一个。
2. 对所有形参，创建绑定
3. 判断是否需要创建 arguments 对象。 三种情形除外：箭头函数，形参已含有 arguments，参数没有表达式并且 arguments 被占用（被 function | generator | let | const | class 声明占用）
4. 根据是否严格模式，创建不同的 arguments 对象，并设置绑定初始化。
5. 令 iteratorRecord 为以 arguments 为参数创建的迭代对象。 执行 IteratorBindingInitialization(iteratorRecord, env)
6.   如果参数中没有表达式，对每个没有实例化的 VarDeclaredNames，创建绑定，并初始化为 undefined
7.  否则，参数有表达式，以当前的环境为参数创建一个声明式环境 varEnv。对 VarDeclaredNames 中每个没有实例化的元素 n ：
	1. 如果 n 不在参数名列表中，或者 n 是一个函数名 设置初始值为 undefined
	2. 否则，初始值从原环境记录项 envRec 中获取。
	3. 注意（ 也就是说，如果 var 变量与形参同名，初始化时也有相同的值。）    
8. 如果不是 严格模式，再创建一个声明式环境，改变原来的词法环境
9. 对所有的词法声明，在词法环境记录项上创建绑定。（注意，在此并未初始化）
10. 对 functionsToInitialize 中的函数，实例化函数对象（以词法环境为参数）并在变量环境记录项上设置绑定值。

`VarDeclaredNames` ： FunctionDeclaration、 GeneratorDeclaration and VariableDeclaration
`LexicallyDeclaredNames` ： let 、const and class

`IteratorBindingInitialization` ：
遍历处理所有形参，如果有初始值，并且形参未设置。对右侧求值，并设置形参的初始化值。

上面的第七步解释了 为何 y 的值为 1。以及 f() 的值为 1。

ES6 的规范比 ES5 多了不少内容。需要搞明白的时候再拿来慢慢阅读。
