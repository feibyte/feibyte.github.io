---
title: 烦人的 Flow.js
date: 2019-06-17 12:16:09
tags: 编程语言
thumbnail: /gallery/thumbnails/flowjs.png
---

不管怎么说，Javascript 构建的项目越来越大且越来越复杂，弱类型这个短板显得越来越为致命。而 `Flow.js` 提供了一个向强类型过渡的方案。

1. 挫挫的枚举类型

```
type Color = 'red' | 'blue' | 'green';

const Colors = Object.freeze({
  Red: 'Red',
  Blue: 'Blue',
  Green: 'Green',
})
type Color = $Values<typeof Colors>;
```


2. 莫名其妙的严格

```
type Vehicle = { name?: string }
const car: Vehicle = {}; // It works

type Vehicle = {| name?: string, color?: string |}
const car: Vehicle = { color: '' }; // It works

type Vehicle = {| name?: string |}
const car: Vehicle = {}; // Error
```

3. 不严格的类型和里式替换

我们知道，在 flow.js 中，当我们定义一个类型时，`type Vehicle = { name: string }` 只是意味着这个对象至少有 `name: string` 这个属性，你可以这样 `const bike: Vehicle = { name: 'bike', brand: 'phoenix' }`。就是因为太不严格，所以我们会选择严格类型 `type Vehicle = {| name: string |}` 不过接下来就遇到麻烦了。
```
type Vehicle = {|
  name: string,
|}
type Car = {
  ...Vehicle,
  wheel: number
};
const car: Car = { name: 'Toyota', wheel: 4 };
const vehicle: Vehicle = (car: Vehicle); // Cannot cast `car` to `Vehicle`
```

4. 三方库依赖问题

有次突然发现我们漏掉了 `import * as React from "react";` 但是可以直接使用 React.Node，flow.js 竟然没有报错。当然，它只可能是默认的 Any 类型。很快就定位到在 `flow-typed/npm/enzyme_v3.x.x.js` 包含有：
```
import * as React from "react";
declare module "react-redux" {
  // Here will use React type
}
```
看样子是，只要在声明文件中导入之后，类型就被污染了。被污染的还有：Dispatch, Store, React, ComponentType and ElementConfig 不难猜到越是流行的库越可能被污染。而这一切发生的时候，flow.js 没有任何警告信息或错误提示。
Known issue: https://github.com/flow-typed/flow-typed/issues/1857

5. 第三方库

时不时的第三方库导致 flow 错误，又不能 ignore 所有的 node_modules 文件，每次遇到新错误，都只能加载后面。甚至 node_modules/**/test/*.json 都有可能导致 flow 错误。 目前没有什么优雅的办法：https://github.com/facebook/flow/issues/869
```
[ignore]
.*\/node_modules\/draft-js\/lib\/.*.js.flow.*
```


6. 关于 $FlowFixMe

有时 flow 不够聪明，即使我们知道没有那个逻辑，当然有时我们可以绕过这些报错。个人认为用额外的逻辑来弥补 flow 的错误更不合适。$FlowFixMe 是很烦，但是至少不会引起困惑。


