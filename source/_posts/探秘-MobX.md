---
title: 探秘 MobX
date: 2017-03-30 21:41:22
tags: ["MobX", "框架"]
---

[MobX](https://github.com/mobxjs/mobx) 是最近在 React 社区比较火的状态管理工具。与 Redux 相比，Mobx 简单又神秘。不止是因为 MobX 比较火，MobX 的双向绑定与 Vue 的实现也是非常相似，十分有必要去了解一下双向绑定的实现。这篇文章通过源码解释 MobX 这些奇怪的“特性”。
就像 Redux，MobX 跟 React 也没有关系，我们从最最简单的例子开始。MobX 版本 3.1.7

<!-- more -->

## observable
```javascript
const store = observable({
 title: 'front end developer',
});
```
observable 返回一个新的对象 `ref`，包含一个 `$mobx` 属性，`$mobx` 是一个 ObservableObjectAdministration 对象。这个对象稍微有点复杂，不过其实就是 Object.defineProperty 拦截 getter 和 setter，我们暂不需要弄懂 getter 和  setter 究竟做了什么事情。values.title 是一个 ObservableValue 对象，我们大概可以猜到它的属性 observers 存放了观察 values.title 变化的对象。
```javascript
{
  title: 'front end developer',
  $mobx: { // ObservableObjectAdministration
    name: 'ObservableObject@1.user',
    target: ref, // 指向新返回对象
    values: {
      title: { // ObservableValue
        value: 'front end developer',
        name: 'ObservableObject@1.title',
        observers: [],
        get() {
          this.reportObserved();
          return this.value;
        },
        set: function(v) {
          setPropertyValue(this, propName, v);
		    },
      },
    },
  },
  get title: function() {
    return this.$mobx.values[propName].get(); // 这儿的 propName
  },
  set title: function(v) {
    setPropertyValue(this, propName, v);
  },
}
```
上面只是一个最简单的对象，如果对象复杂点，也会递归的包装对象。

## autorun
在一个函数中简单输出 store.title，我们跟踪下 autorun 方法。
```javascript
autorun(() => {
  console.log(store.title);
});
```
autorun 方法会使用传入的参数创建一个 Reaction 对象 reaction， 然后调用 reaction 的 schedule 方法。
```javascript
{
  name: 'Reaction@2',
  onInvalidate() {
    function reactionRunner() {
      view(reaction); // view 传入的匿名函数
    }
    this.track(reactionRunner);
  },
  observing: [],
  newObserving: [],
  dependenciesState: IDerivationState.NOT_TRACKING,
  __mapid: '#3',
  diffValue: 0,
  runId: 0,
  unboundDepsCount: 0,
  isDisposed: false,
  _isScheduled: false,
  _isTrackPending: false,
  _isRunning: false,
}
```
schedule 方法将 reaction  添加到 pendingReactions，最后执行每个 reaction 的 runReaction 方法。
```javascript
runReaction() {
  startBatch();
  this._isScheduled = false;
  if (shouldCompute(this)) {
    this._isTrackPending = true;
    this.onInvalidate(); // 这个就是初始化用匿名函数构造的一个方法。
  }
  endBatch();
}
```
onInvalidate 调用 track， track 调用 trackDerivedFunction，跟踪下 trackingDerivation
```javascript
function trackDerivedFunction(derivation, f, context) {
  // ...
  derivation.runId = ++globalState.runId;
  const prevTracking = globalState.trackingDerivation; // 保存当前 trackingDerivation
  globalState.trackingDerivation = derivation; // 设置全局 trackingDerivation
  let result;
  try {
    result = f.call(context); // 执行我们传入的匿名函数，newObserving
  } catch (e) {
    result = new CaughtException(e);
  }
  globalState.trackingDerivation = prevTracking;
  bindDependencies(derivation); // 重新收集依赖
  return result;
}
```
这个函数在执行我们的匿名函数之前，设置全局 trackingDerivation 为当前的 reaction ，执行之后又设置回原来的变量。在我们的匿名函数中打印 store.title，回想下最开始 ObservableValue 对象在解析 store.title 值时会调用 reportObserved 。
```javascript
function reportObserved(observable) {
  const derivation = globalState.trackingDerivation;
  if (derivation !== null) {
    if (derivation.runId !== observable.lastAccessedBy) { // 简单优化
      observable.lastAccessedBy = derivation.runId;
      derivation.newObserving[derivation.unboundDepsCount++] = observable;
    }
  } else if (observable.observers.length === 0) {
    queueForUnobservation(observable);
  }
}
```
这儿的 derivation 就是我们的 autorun 创建的 Reaction 对象。到现在我们瞧出了一下端倪，在一个 Reaction 环境中解析值，则该 Reaction 依赖该 observable 对象。注意这儿并没有直接放到 observing 数组中！执行完当前方法之后，在 bindDependencies 才重新设置了 observing。这一步是必需的，考虑下 autorun 中有条件语句的情景，除了条件语句，如果我们的对象稍复杂点，譬如 store.user.title，我们对 store.user 重新赋值就会改变依赖的 observable。最后分析下下面的代码片段，猜测输出几次：
```javascript
autorun(() => {
  console.log(store.title);
  store.title = 'hello world!';
});
```
你会发现输出一次，因为初次执行时reaction.observing 为空，执行完之后才会根据 reaction.newObserving 更新 observing。再在外面修改 store.title = 'changed title'，这次就会正常的输出 changed title 然后输出 hello world!

bindDependencies 设置新的 observing 后，还同步更新依赖的 ObservableValue 的 observers，store.title 被哪些依赖到需要更新。在 store.title 发生变化时，setPropertyValue 会触发 propagateChanged 方法
```javascript
function propagateChanged(observable) {
  if (observable.lowestObserverState === IDerivationState.STALE) return;
  observable.lowestObserverState = IDerivationState.STALE;

  const observers = observable.observers;
  let i = observers.length;
  while (i--) {
    const d = observers[i];
    if (d.dependenciesState === IDerivationState.UP_TO_DATE)
      d.onBecomeStale(); // call shedule
    d.dependenciesState = IDerivationState.STALE;
  }
}
```
observable 变化时，调用 observers 中每个对象的 onBecomeStale 方法，对 Reaction 对象来说 onBecomeStale 简单的调用 shedule；对 ComputedValue 对象来说则会执行 propagateMaybeChanged，这儿有些优化如果 Reaction 对象状态不是已经更新（ UP_TO_DATE），什么都不做。为说明这个问题，我们造一个例子：
```javascript
const store = observable({
  a: 3,
  b: 4,
  get sum() {
    return this.a + this.b;
  },
});
autorun(() => {
  console.log(store.sum);
  store.b = 5;
});
store.b = 6;
```
上面这个例子只输出一次，注释掉 autorun 中的 store.b = 5 赋值语句，结果当然会输出两次。如果该赋值语句丢在另一个 autorun 中则会输出四次。不知道该如何解释。

## 结语

MobX 的[反应系统](https://github.com/mobxjs/mobx/blob/gh-pages/docs/best/react.md)不难理解，从图中的线条就能看出来。分析源码可以帮助我们搞明白在[pixel paint](https://hackernoon.com/an-artificial-example-where-mobx-really-shines-and-redux-is-not-really-suited-for-it-1a58313c0c70)这个例子中为什么它会这么高效，在以后的项目中我们也可以受到启发。双向绑定主要是依赖收集，理解起来比较简单，但是关于性能优化部分的分析本篇文章没有提及，有兴趣的同学可以深入研究一下。
