---
title: Babel polyfill
date: 2019-08-25 15:09:56
tags: babel
thumbnail: /gallery/thumbnails/babel.png
---

As a front developer, we should keep in mind what browsers are used by our customers.  We say only modern browsers and IE 11 are supported, at least users won’t get an error on IE 11.  Our config is : `['last 2 versions', 'ie >= 11']` and here’s detailed browsers: [last 2 versions](https://browserl.ist/?q=last+2+versions).  If you find your config is different from this one, please ensure your config is a superset of the above list.

## Mystery of  Babel
With `Babel`, we could use new features of ES without worrying about compatibility.  You must have got some error saying browser doesn’t support it even you’re using babel. Yeah, you might know we still have to take care of polyfill.  Have you ever been confused about various babel packages? 

`@babel/preset-env` `@babel/transform-runtime` `@babel/runtime`  `@babel/polyfill`

To help you better understand those, Let’s do some experiment. 
Let’s say the source code looks like this:
```js
class A {
    method() {}
}
const arr = Array.from(['a']);

const s = new Symbol();

function* gen() {
    yield 3;
}

let array = [1, 2, 3, 4, 5, 6];
array.includes(item => item > 2);

const promise = new Promise();
```
Please note: `class` `arrow function` `let` `const` are part of the syntax. 

`Promise` and `Symbol` and `Array.from`  belong to global properties and static properties.

`[].includes` is instance property.

### Preset-env
Firstly, we just add `preset-env` and see what’s the outcode looks like
```js
[
  "@babel/env",
]
```
Outcode(output 1) ⬇️⬇️⬇️⬇️⬇️ 
```js
"use strict";

var _marked =
/*#__PURE__*/
regeneratorRuntime.mark(gen);

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var A =
/*#__PURE__*/
function () {
  function A() {
    _classCallCheck(this, A);
  }

  _createClass(A, [{
    key: "method",
    value: function method() {}
  }]);

  return A;
}();

var arr = Array.from(['a']);
var s = new Symbol();

function gen() {
  return regeneratorRuntime.wrap(function gen$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          _context.next = 2;
          return 3;

        case 2:
        case "end":
          return _context.stop();
      }
    }
  }, _marked);
}

var array = [1, 2, 3, 4, 5, 6];
array.includes(function (item) {
  return item > 2;
});
var set = new Promise();
```
As we can see, babel transforms new syntax to the old one for us. But didn’t change the static methods in the new feature. (Notice it’s using global `regeneratorRuntime` )

 

If we specify targets only for modern browsers like below: 
```js
[
  "@babel/env",
  {
    targets: {
        browsers: ['Chrome 70'],
    },
  }
]
```
The outcode is almost same with source code. It’s not surprising.

 

Let’s move on. Now we set `useBuiltIns` as 'usage'
```js
[
  '@babel/preset-env',
  {
    targets: {
      browsers: ['defaults'],
    },
    useBuiltIns: 'usage',
    corejs: 3, // using useBuiltIns without declare corejs version will get warning.
    modules: false,
  },
],
```
We found babel imported a few files for us.  

```js
import "core-js/modules/es.symbol";
import "core-js/modules/es.symbol.description";
import "core-js/modules/es.array.from";
import "core-js/modules/es.array.includes";
import "core-js/modules/es.object.to-string";
import "core-js/modules/es.promise";
import "core-js/modules/es.string.iterator";
import "regenerator-runtime/runtime";
// Below is same with output1
```
From now I set modules as false, so the outcode is using import rather than require.

 

`useBuiltIns` has another option: ‘entry'.  

It won’t import polyfill for us. We still have to import polyfill by yourself but it will import specific files in terms of your target setting. 
```js
import 'core-js/stable';
import 'regenerator-runtime/runtime';
```
If in your entry files, you have the above code, it will transform to the below one. (It depends on your target browsers. Even you never use it in your code.)
```js
import "core-js/modules/es.symbol.description";
import "core-js/modules/es.symbol.async-iterator";
import "core-js/modules/es.array.flat";
import "core-js/modules/es.array.flat-map";
....
// very long  
```
### Transform-runtime

Let’s disable `useBuiltIns` and move on. Add plugins to babel config file: `"plugins": ["@babel/plugin-transform-runtime"]`

The outcode:
```js
import _regeneratorRuntime from "@babel/runtime/regenerator";
import _classCallCheck from "@babel/runtime/helpers/classCallCheck";
import _createClass from "@babel/runtime/helpers/createClass";

var _marked =
/*#__PURE__*/
_regeneratorRuntime.mark(gen);

var A =
/*#__PURE__*/
function () {
  function A() {
    _classCallCheck(this, A);
  }

  _createClass(A, [{
    key: "method",
    value: function method() {}
  }]);

  return A;
}();

var arr = Array.from(['a']);
var s = new Symbol();

function gen() {
  return _regeneratorRuntime.wrap(function gen$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          _context.next = 2;
          return 3;

        case 2:
        case "end":
          return _context.stop();
      }
    }
  }, _marked);
}

var array = [1, 2, 3, 4, 5, 6];
array.includes(function (item) {
  return item > 2;
});
var promise = new Promise();
```
This outcode is a bit different from the previous. As the [documentation](https://babeljs.io/docs/en/babel-plugin-transform-runtime#technical-details), by default, it set regenerator as true. Besides, it replaced inline helper with the module. But it didn’t import any polyfill files.
 

Let’s try other params:  `["@babel/plugin-transform-runtime", {"corejs": 3 }]`

The out code
```js
import _Promise from "@babel/runtime-corejs3/core-js-stable/promise";
import _includesInstanceProperty from "@babel/runtime-corejs3/core-js-stable/instance/includes";
import _regeneratorRuntime from "@babel/runtime-corejs3/regenerator";
import _Symbol from "@babel/runtime-corejs3/core-js-stable/symbol";
import _Array$from from "@babel/runtime-corejs3/core-js-stable/array/from";
import _classCallCheck from "@babel/runtime-corejs3/helpers/classCallCheck";
import _createClass from "@babel/runtime-corejs3/helpers/createClass";

var _marked =
/*#__PURE__*/
_regeneratorRuntime.mark(gen);

var A =
/*#__PURE__*/
function () {
  function A() {
    _classCallCheck(this, A);
  }

  _createClass(A, [{
    key: "method",
    value: function method() {}
  }]);

  return A;
}();

var arr = _Array$from(['a']);

var s = new _Symbol();

function gen() {
  return _regeneratorRuntime.wrap(function gen$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          _context.next = 2;
          return 3;

        case 2:
        case "end":
          return _context.stop();
      }
    }
  }, _marked);
}

var array = [1, 2, 3, 4, 5, 6];

_includesInstanceProperty(array).call(array, function (item) {
  return item > 2;
});

var promise = new _Promise();
```
Here you see: it helped us handle new global properties even instance properties in a different way. It was using internal methods, which means it won’t pollute prototype or global namespace.

It’s commonly used in the development of the third library. 

Also, you might have already noticed, we should ensure the packages used in outcode is accessible. `@babel/runtime` or `core-js` or `regenerator-runtime/runtime`  (`@babel/polyfill` has been deprecated.  use `core-js/stable` and `regenerator-runtime/runtime` directly. )

### Which one we should choose

Here’s [guide](https://babeljs.io/docs/en/babel-polyfill#usage-in-node-browserify-webpack)

If we take a look at CRA  [create.js](https://github.com/facebook/create-react-app/blob/master/packages/babel-preset-react-app/create.js)  it’s using `@babel/plugin-transform-runtime` to save on codesize and regenerator polyfill.  In `@babel/preset-env` set `useBuiltIns: 'entry'`, it means we should import polyfill by ourselves.  Here’s detailed documentation: https://create-react-app.dev/docs/supported-browsers-features#supported-browsers  

For us, maybe the best way is aligning our solution to CRA. For the micro front end,  the best way is to import polyfill in the shell entry, others don’t need import twice.

I know, even we import all polyfill files, it doesn’t make much difference. Anyway, we’re stepping into the right direction.

