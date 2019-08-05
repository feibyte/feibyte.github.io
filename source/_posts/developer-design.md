---
title: "为开发者的设计"
date: 2013-11-10
category: 心得总结
tags: [设计]
---
design for developers 老外的 presentation

<!-- more -->

大概整理了下：

- 排版 字体大小最少14px 或者默认大小，有时也依赖字体； 可读长度不超过60字符；
  headings 1.1倍行高 段落1.5倍行高
- 对齐 接近原则（格式塔），留空白分组；数字6，font-size 12 line-height 18 font-size 16 line-height 24 主要元素间距6个单元 正常间距4个单元 较小间距 2个单元
以6px作为一个单元 head与content间距4个单元-24px header上4个单元-24px，高16个单元-96px；
适当使用空白，文字左对齐右侧空白合理使用。
- 光影 阴影不是纯黑 ；1-3px drop大小 0-3px距离；窗口阴影有点过度，但是表现了窗口居于所有内容之上。；按钮，渐变，从上到下由亮变暗，按下时内部阴影；千万不要只是交换阴影方向；一般来说，光源的方向来自120°角。
- 颜色 简单三色，head 类#000 body#333 减弱类#666；有背景色时，字体颜色千万不要是白色或灰色，简单设置rgb(255,255,255,0.9);颜色尽可能少，三色和红色警告、绿色成功提示，加上熟悉的配色。
- 图标 只用众所周知图标，否则使用文字，或文字加图标
- 重用设计 bootstrap 不要移去outline

总结：实际上，12px 的汉字实在是太小了，当然也跟分辨率设置有关。13px 的还差不多。verdana 字体看上还不错，不过放在在阅读的板块中间距显得大了点，所以下面就没用使用。简单看了下几个网站的间距、字体。13px 的中文还不少。行高在1.5左右。间距也是一样的，如果按照他所给的间距有时又显得太宽。按钮简单看了下几个网站的，bootstrap 的按钮点击状态并没用表现出太多区别，apple 的倒明显。musescore 的倒是变亮了。觉得 apple 的不错，下面用的就是 apple.com 的。另外，之前读的一篇文章讲层次感：背景色区域 ---
 实线 --- 虚线 --- 空白。这个在新闻网站页面分栏能够很好的体现出来。原文章不记得链接了。

最后依据这些原则简单定义了一些样式：

```css
body {
    font-size: 12px;
    line-height: 1.5;
    color: #333;
}
h1, h2, h3, h4 , h5 {
    font-size: 16px;
    line-height: 1.1;
    color: #000;
}
header{
    margin: 24px 0;
}
.container {
    width: 936px;
    margin: 0 auto;
}
aside {
    float: left;
    width: 216px;
}
.post{
    margin-left: 240px;
}
input[type="text"], input[type="email"] , input[type="password"], textarea{
    border: 1px solid #ccc !important;
    border-radius: 4px;
    -webkit-box-shadow: inset 0 1px 1px rgba(0,0,0,0.075);
    box-shadow: inset 0 1px 1px rgba(0,0,0,0.075);
    -webkit-transition: border-color ease-in-out .15s,box-shadow ease-in-out .15s;
    transition: border-color ease-in-out .15s,box-shadow ease-in-out .15s;
}

input[type="text"]:focus, input[type="email"]:focus, input[type="password"]:focus, textarea:focus{
    border-color: #66afe9 !important;
    outline: 0;
    -webkit-box-shadow: inset 0 1px 1px rgba(0,0,0,0.075),0 0 8px rgba(102,175,233,0.6);
    box-shadow: inset 0 1px 1px rgba(0,0,0,0.075),0 0 8px rgba(102,175,233,0.6);
}
button, input[type="button"], input[type="reset"], input[type="submit"]{
    color: #FFF;
    border: 1px solid;
    border-radius: 4px;
    -webkit-box-shadow: inset 0 1px 1px 0 #6fc5f5;
    box-shadow: inset 0 1px 1px 0 #6fc5f5;
    background: #117ed2;
    background: -webkit-gradient(linear,left top,left bottom,from(#37aaea),to(#117ed2));
    background-image: linear-gradient(to bottom,#37aaea 0,#117ed2 100%);
}
button:hover, button:focus, input[type="button"]:hover, input[type="button"]:focus,
input[type="reset"]:hover, input[type="reset"]:focus, input[type="submit"]:hover, input[type="submit"]:focus{
    background: #1c5bad;
    background: -webkit-gradient(linear,left top,left bottom,from(#2488d4),to(#1c5bad));
    background-image: linear-gradient(to bottom,#2488d4 0,#1c5bad 100%);
    -webkit-box-shadow: inset 0 1px 1px 0 #64bef1;
    box-shadow: inset 0 1px 1px 0 #64bef1;
}
```
