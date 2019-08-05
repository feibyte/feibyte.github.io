---
title: "js 模式--一般模式篇"
date: 2013-11-23
category: 心得总结
tags: [js模式]
---

> 读石川js模式，以下出自：<http://shichuan.github.io/javascript-patterns/>

有些代码只是部分复制，另外加注的是自己的一点愚见。原文中的preferred 翻译为建议 、倾向于、宁愿。

<!-- more -->

## 1  函数声明 创建匿名函数赋给变量
```js
    //anti-pattern 反面模式
    function getData() {
    }

    //倾向于
    //好处：1.更容易理解‘函数即对象’ 2.促使使用;习惯 3.不再有函数和作用域感情包袱
    var getData = function () {
    };

    //命名函数表达式
    //优点：1.debuger时有显式的函数名称 2.允许递归调用
    //问题：can break IE
    var getData = function getData () {
    };
```
注：如果需要递归，使用arguments.callee也很方便，且在重命名函数名称时，不需要在第二处修改。
```
    //下面这种方式避免了上面的问题
    var getData = function getDataF () {
    };
```
注：typeof getDataF === 'undefined' IE8及以下的标示符泄露， typeof getDataF === 'function'

## 2  条件
```
    //正常模式
    if (type === 'foo' || type === 'bar') {
    }

    // 方法1 - regex test
    if (/^(foo|bar)$/.test(type)) {
    }

    // 方法2 - object literal lookup (smaller if < 5 items)
    if (({foo:1, bar:1})[type]) {
    }

    // 方法3 二分查找

    //方法四 对象数组查找表
    //对单键值对的尤其适用
    // define the array of results
    var results = [result0, result1, result2];
    // return the correct result
    return results[value];
    //方法5 使用逻辑操作符
```
注： 看上去好高端又节省代码

## 3  访问全局对象
```
    var global = (function () {
            return this || (1, eval)('this');
    }());
```
注：表达式(1, eval)，严格模式下规定引用类型的eval作用在全局。

## 4  单一var模式
```
    //使用一个var声明多个变量
    //优点： 1.提供了查找函数需要局部变量的唯一的位置 2.防止未定义先使用的逻辑错误 3.提醒你声明变量，防止误声明为全局变量 4.字符数较少
    //把逗号放在变量前 避免忘记
    function func() {
        var a = 1
          , b = 2
          , sum = a + b
          , myobject = {}
          , i
          , j;

        // function body...
    }
```
注： 对于习惯其它强类型语言人来说，这种写法是绝对不赞同的。还记得C中的 int * a,b;声明的其实是一个指向整型的指针变量和整型变量。我个人是不在乎多写几个字符。
另外将变量放在一处声明，个人也不是很赞同，尤其是函数比较长的话，你压根就不记得这个变量有没有声明了，在声明处看也看不出这个变量是干嘛的。（不记得是不是《代码简洁之道》中提的）
比较赞同的写法是离最近使用的地方声明，比如，for循环中的i就该在for上面声明。

## 5  Hoisting 在函数中的var语句就相当于变量声明在函数顶部
```
    // 反面模式
    myname = "global"; // global variable
    function func() {
            alert(myname); // "undefined"
            var myname = "local";
            alert(myname); // "local"
    }
    func();
```
上面的代码片段就相当于：
```
    myname = "global"; // global variable
    function func() {
            var myname; // same as -> var myname = undefined;
            alert(myname); // "undefined"
            myname = "local";
            alert(myname); // "local"
    }
    func();
```
注：虽然知道，但是感觉这种错误太容易犯了。因为倾向的代码风格使用var再次声明。

## 6  for循环 （注：copy不全）
```
    // 提供的倾向的方法1 使用单一var
    var i, myarray = [];
    for (i = myarray.length; i--;) {
        // do something with myarray[i]
    }
```
注： 很多IDE都能够自动生成，下面是sublime text2自动生成的。
```
    for (var i = Things.length - 1; i >= 0; i--) {
        Things[i]
    };
```
## 7  for in 循环
```
    // 定义一个对象
    var man = {
            hands:2,
            legs:2,
            heads:1
    };

    // 添加一个方法
    if (typeof Object.prototype.clone === 'undefined') {
        Object.prototype.clone = function () {
        };
    }

    // 反面模式
    // for-in loop without checking hasOwnProperty()
    for (var i in man) {
        console.log(i, ":", man[i]);
    }

    // 建议方法 1
    for (var i in man) {
        if (man.hasOwnProperty(i)) { // filter
            console.log(i, ":", man[i]);
        }
    }

    // preferred 2
    // benefit is you can avoid naming collisions in case the `man` object has redefined `hasOwnProperty`
    for (var i in man) {
        if (Object.prototype.hasOwnProperty.call(man, i)) { // filter
            console.log(i, ":", man[i]);
        }
    }

    // preferred 3
    // use a local variable to "cache" `Object.prototype.hasOwnProperty`
    var i,
        hasOwn = Object.prototype.hasOwnProperty;
    for (i in man) {
        if (hasOwn.call(man, i)) { // filter
            console.log(i, ":", man[i]);
        }
    }
```
注：一般的写法也就是方法1，没有考虑到hasOwnProperty会被重定义，重定义原始对象方法的都是二货。

## 8  不要增加内置prototypes

//也有几个例外 1. 2. 3
注： 你还想例外，还是当没有例外吧。.

## 9  switch模式
```
    //提高代码可读性和鲁棒性 1.对齐case switch 2.缩进case内的代码 3.case以break结束 4.如果不需要break是更好的方法，确保有注释 5.以default结束
    /* Style conventions:
     * 1. Aligning each `case` with `switch` (an exception to the curly braces indentation rule).
     * 2. Indenting the code within each case.
     * 3. Ending each `case` with a clear `break`;.
     * 4. Avoiding fall-throughs (when you omit the break intentionally). If you're absolutely convinced
     *    that a fall-through is the best approach, make sure you document such cases, because they might
     *    look like errors to the readers of your code.
     * 5. Ending the `switch` with a `default`: to make sure there's always a sane result even if none of
     *    the cases matched.
     */

    var inspect_me = 0,
                    result = '';
    switch (inspect_me) {
    case 0:
            result = "zero";
            break;
    case 1:
            result = "one";
            break;
    default:
            result = "unknown";
    }
```
注： 还记得一同学写的一个计算日期相差天数的函数，里面的case都没有break;给有强迫症的人看真抓狂--！

## 10  避免隐式类型转换
```
    var zero = 0;
    // 反面模式
    if (zero == false) {
            // this block is executed...
    }

    一直使用 === 或者 !== 检查比较的类型和值
    if (zero === false) {
        // not executing because zero is 0, not false
    }
```
原注：有时严格比较会比较多余，如大家都知道typeof 返回的是 string，所以就没必要使用严格比较。但是jshint需要严格比较，这让代码看起来更一致。
注：我倒是赞同使用严格比较，但是为嘛老觉得需要严格比较多次呢，比如感觉经常需要判断是 undefined和null，以后得想下了。不记得在哪儿看的了，说代码中还是要区分undefined和null的，因为语义上讲，undefined表示该对象你压根没定义，null表示你可能是忘了赋值。

## 11  避免eval()
```
    // 反面模式1
    var property = "name";
    alert(eval("obj." + property));

    // 建议 1
    var property = "name";
    alert(obj[property]);
    注：obj['name'] 在jshint审查时会提示你使用obj.name，因为常量字符串

    /* 反面模式 2
     * It's also important to remember that passing strings to setInterval(), setTimeout(),
     * and the Function() constructor is, for the most part, similar to using eval() and therefore should be avoided.
     */
    setTimeout("myFunc()", 1000);
    setTimeout("myFunc(1, 2, 3)", 1000);


    // preferred 2
    setTimeout(myFunc, 1000);
    setTimeout(function () {
        myFunc(1, 2, 3);
    }, 1000);
    // in supported browsers (i.e. not IE)
    setTimeout(myFunc, 1000, 1, 2, 3);
```

## 11  数字转换 parseInt()使用第二个参数
在这个例子中，如果你省略了进制参数，如parseInt(year) 返回值可能是0 因为把09当做八进制数，而09又不是一个合法的八进制数。
```
    var month = "06",
        year = "09";
    month = parseInt(month, 10);
    year = parseInt(year, 10);
```
//注：chrome下还是得到的还是9，提到数字，想起了前几天修的一个问题，在浮点数相加时。看着像bug一样。    
0.1 + 0.2 结果是 0.30000000000000004 toFixed(2)

## 12  尽量少用全局变量
