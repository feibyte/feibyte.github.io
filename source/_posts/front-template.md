---
title: "前端模板"
date: 2013-10-15
category: 造轮子
tags: [template]

---

### 原始的不足

在最开始接触前端的时候，经常写这样的代码，当然不止做前端的时候都写过这样的代码。

<!-- more -->

```js
var content = "<table><tr><th>name</th><th>score</th></tr>";
for (var i = Things.length; i >= 0; i--) {
    content += "<tr><td>" + Things[i].name + "</td><td>" + Things[i].score + "</td></tr>";
}
content += "</table>";
document.getElementById('table').innerHTML = content;
```
smells bad! 太复杂且不利于阅读。使用引擎之后，可能是这样：(模板格式是自己随便写的，jekyll 使用的 liquid 模板，在这个项目中经常看到下面格式模板)

```html
<table>
    <tr><th>name</th><th>score</th></tr>
    {{ "{{ for student in Things" }} }}
    <tr><td>{{ "{% student.name" }} %}</td><td>{{ "{% student.score" }} %}</td></tr>
</table>
```

`{``{` 与博客模板冲突，后面换成 `<%` 之前算是学过 jsp 吧，对这样的标记并不陌生，`<%= %> <% %>` 之间插入 java 代码，只不过 jsp 是编译成 servlet 的。

### 模板要达到的效果

一个模板要达到的效果至少不能再让我用 + 连接字符串了。(之前的项目里就有一个 format 方法做这种事，用于将 html 模板中的 `#{}` 替换为变量值。之后模板最好支持分支逻辑和循环遍历，上面的 student.score 可能需要根据值以不同颜色显示。另外，经常是数据的展现形式与数据不完全相同，比如日期 date，输出的要求可能是('YYYY-MM-DD')，还有经常出现的 bool 值，可能存的是 true false 或者 0 1 或者 yes no 显示的时候又要显示为中文 是 否等。如果支持一个适配函数的形式就比较方便。

标记选取 `<% %>`只是约定形式，个人喜好 `<%= %>`，`<% %>` 这种。上面文章也提到避免与后端标记冲突，模板标记转义。  
模板位置：现在比较常见的是放在 &lt;script&gt; 标签中。web components 组件规范中直接定义了一个 template 元素，不过并未广泛支持。

```html
<script type="text/tmpl" id="myTmpl">
    模板放这里......
</script>
```
关于性能：文章指出了性能是个伪命题，也给了理由。但还是需要了解下 artTemplate 性能高效原因：<http://cdc.tencent.com/?p=5723>(原文有链接)

+ 预编译  各个模板简单说最终还是生成了一个 js 函数，预编译当然就是，，。
+ 更快的字符串相加方式  很多人误以为数组 push 方法拼接字符串会比 += 快，要知道这仅仅是 IE6-8 的浏览器下。实测表明现代浏览器使用 += 会比数组 push 方法快，而在 v8 引擎中，使用 += 方式比数组拼接快 4.7 倍。

关于异常处理：就是模板函数执行错误时，artTemplate 能指定到行号。文中还给出了一个简单的 demo 方案。就是在生成的代码中每行插入 `$liine = currentLine` 这样的东西，感觉很老土，不知道 artTemplate 是不是采用的这种方式。

### 自己实现一个简单的模板解析

jQuery 作者 john 开发的微型模板引擎 <http://ejohn.org/blog/javascript-micro-templating/>

```js
// Simple JavaScript Templating
// John Resig - http://ejohn.org/ - MIT Licensed
(function(){
  var cache = {};

  this.tmpl = function tmpl(str, data){
    // Figure out if we're getting a template, or if we need to
    // load the template - and be sure to cache the result.
    var fn = !/\W/.test(str) ?
      cache[str] = cache[str] ||
        tmpl(document.getElementById(str).innerHTML) :

      // Generate a reusable function that will serve as a template
      // generator (and which will be cached).
      new Function("obj",
        "var p=[],print=function(){p.push.apply(p,arguments);};" +

        // Introduce the data as local variables using with(){}
        "with(obj){p.push('" +

        // Convert the template into pure JavaScript
        str
          .replace(/[\r\t\n]/g, " ")
          .split("<%").join("\t")
          .replace(/((^|%>)[^\t]*)'/g, "$1\r")
          .replace(/\t=(.*?)%>/g, "',$1,'")
          .split("\t").join("');")
          .split("%>").join("p.push('")
          .split("\r").join("\\'")
      + "');}return p.join('');");

    // Provide some basic currying to the user
    return data ? fn( data ) : fn;
  };
})();
```

以下面的模板为例：

```html
<h3>
    <% if (typeof content === 'string') { %>
    <%= content %>
    <% } %>
</h3>
```
解析之后生成的函数类似：

```js
function anonymous(obj/**/) {
  var p=[];
  with(obj){
    p.push(' <h3> ');
    if (typeof content === 'string') {
      p.push(' ', content ,' ');
    }
    p.push(' </h3> ');
  }
  return p.join('');
}
```

刚给出的模板引擎正则表达式那段不大容易看懂，作用就是将`<% %>`里面的内容直接作为字符串，其它的正文则是压入结果数组。我自己稍微改了下：

```js
var cache = {};
this.tmpl = function (str, data) {
  var fn = !/\W/.test(str) ?  cache[str] = cache[str] || tmpl(document.getElementById(str).innerHTML) :
      new Function("obj" , "var p = []; with(obj){" +
           format(str) +
      "};return p.join('');");
  return data ? fn(data) : fn;
};
function format (str) {
  str = '%>' + str + '<%';
  return str.replace(/[\r\n\t]/g, ' ')
  .replace(/<%=(.*?)%>/g, "',$1,'")
  .split("<%").join("');")
  .split("%>").join("p.push('");
}
```

测试页面在：<http://fiddle.jshell.net/fedeoo/6jwMy/2/show/>

> 一篇讲设计模板引擎的文章，不过本身没有讲如何设计。<http://www.toobug.net/article/how_to_design_front_end_template_engine.html>
