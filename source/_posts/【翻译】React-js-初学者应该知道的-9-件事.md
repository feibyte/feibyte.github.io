---
title: 【翻译】React.js 初学者应该知道的 9 件事
date: 2016-07-18 16:24:56
tags: ["翻译", "React"]
---

> 原文地址：[9 things every reactjs beginner should know](https://camjackson.net/post/9-things-every-reactjs-beginner-should-know)
>  2016年1月份的文章，现在才翻译，又落后了半年

现在为止我使用 [React.js](https://facebook.github.io/react/index.html)  已经6 个月了。6 个月 放长远看一点也不长。但是，在 JavaScript 框架层出不穷的今天，6 个月可以称为老前辈了。最近指点了几个新人入门 React ，所以想总结一下写篇文章启发更多的人。下面总结的这些点，一些点是我希望在自己入门的时候就已经知道的，另外一些则是让我真正的理解 React。

<!-- more -->

本文假定你已经有了一下基本的概念。如果你不熟悉 component、props 或者 state  这些名词，你最好先去阅读下官方[起步](https://facebook.github.io/react/docs/getting-started.html)和[手册](https://facebook.github.io/react/docs/tutorial.html)。下面的代码示例我将使用 JSX 作演示，因为使用 JSX 语法写组件更为简洁，也更具表达力。

# 1. React.js 只是一个视图库
我们从最基本的开始。React 不是一个 MVC 框架，好吧，它根本就不是一个框架。它只是一个渲染视图的库。如果你对 MVC 熟悉的话，你就会意识到 React.js 只对应了`V` 这部分，如果它插手了 `M`  或 `C` 的逻辑，你就需要考虑用其它方法来解了。否则，到最后，你的代码很可能会变成一坨翔。这部分后面会细说。

# 2. 组件尽可能的小
这一点有些显而易见，但是有必要强调一下。每个良好的程序员都知道，较小的类、模块更容易理解、测试和维护，对于组件来说也是一样。我起初犯的错误是低估了 React 组件合适的大小。当然，合适的大小取决于很多不同的因素（包括个人与团队偏好），但是，一般来说，我建议，让组件明显小于你本认为的必需大小。举个栗子，我的[个人网站](https://camjackson.net/)主页上的这个组件，用于展示我的最新博文：
```JSX
const LatestPostsComponent = props => (
  <section>
    <div><h1>Latest posts</h1></div>
    <div>
      { props.posts.map(post => <PostPreview key={post.slug} post={post}/>) }
    </div>
  </section>
);
```
这个组件本身是一个 `<section>`，里面只有两个 `<div>`。第一个`<div>`有一个标题，第二个`<div>`只是映射一些数据，使用数据中的每个元素渲染 `<PostPreview>`。还有一部分抽取`<PostPreview>`作为独立组件，这点很重要。我认为这是一个组件最合适的大小。

# 3. 写函数式组件
首先，我们有两种定义 React 组件的方式，第一种是用 `React.createClass()`：
```JSX
const MyComponent = React.createClass({
  render: function() {
    return <div className={this.props.className}/>;
  }
});
```
另一种是 ES6 class 写法：
```JSX
class MyComponent extends React.Component {
  render() {
    return <div className={this.props.className}/>;
  }
}
```
React 0.14 [引入](https://facebook.github.io/react/blog/2015/10/07/react-v0.14.html#stateless-functional-components)了一个新语法来定义组件，使用属性作为参数的函数：
```JSX
const MyComponent = props => (
  <div className={props.className}/>
);
```
这是我最喜欢的定义 React 组件的方式。除了语法上简洁，这种方法还能帮助你界定什么时候需要拆分组件了。我们来回顾下之前的例子，假设下面是没拆分之前的代码：
```JSX
class LatestPostsComponent extends React.Component {
  render() {
    const postPreviews = renderPostPreviews();

    return (
      <section>
        <div><h1>Latest posts</h1></div>
        <div>
          { postPreviews }
        </div>
      </section>
    );
  }

  renderPostPreviews() {
    return this.props.posts.map(post => this.renderPostPreview(post));
  }

  renderPostPreview(post) {
    return (
      <article>
        <h3><a href={`/post/${post.slug}`}>{post.title}</a></h3>
        <time pubdate><em>{post.posted}</em></time>
        <div>
          <span>{post.blurb}</span>
          <a href={`/post/${post.slug}`}>Read more...</a>
        </div>
      </article>
    );
  }
```
这个 class 还凑合。我们已经从 render 方法中抽取了几个方法，方法足够小，命名合理。我们来试着用函数式的语法重写一下：
```JSX
const LatestPostsComponent = props => {
  const postPreviews = renderPostPreviews(props.posts);

  return (
    <section>
      <div><h1>Latest posts</h1></div>
      <div>
        { postPreviews }
      </div>
    </section>
  );
};

const renderPostPreviews = posts => (
  posts.map(post => this.renderPostPreview(post))
);

const renderPostPreview = post => (
  <article>
    <h3><a href={`/post/${post.slug}`}>{post.title}</a></h3>
    <time pubdate><em>{post.posted}</em></time>
    <div>
      <span>{post.blurb}</span>
      <a href={`/post/${post.slug}`}>Read more...</a>
    </div>
  </article>
);
```
代码基本一样，无非是将类里的方法暴露为函数。但是，对我来说，区别可大了。在基于类的例子中，我看到的是`class LatestPostsComponent {`，自然而然会往下扫描闭合括号，然后在心中默想“在这儿这个类结束了，这个组件也到这”。对比函数式组件，我看到 `const LatestPostsComponent = props => {`，看到函数结束，就已经知道“这个函数结束，组件也在这结束”。“但是，等等，这个组件外面的代码是些什么鬼？还在同一个模块，哦，这是另一个函数，接收数据然后渲染视图，我把它抽取到出来就行了”

我就不再啰嗦函数式组件有助于我们遵循上面第二点。

以后，React 也会做一些优化，会使函数式组件比基于类的组件更为高效。（__更新__：函数式组组件的性能影响比我想象的要复杂。但是，如果性能不是大的问题，我依然推荐尽可能的写函数式组件，你应该好阅读下[这个](https://github.com/facebook/react/issues/5677)和[这个](https://github.com/rackt/redux/issues/1176)，选择一个合适自己的）

还有个重要的店，函数式组件有几个 ’限制‘ ，我个人认为是大优点。第一个是它不会有 `ref` 赋给它，`ref` 在查找子组件并与之通信上非常方便，我的感受是 这是使用 React 的 __错误方式__。`refs` 鼓励一种非常直接，近于 jqeury 的方式写组件，远离了 函数式，单向数据流哲学理念，这些理念恰恰是我们选择 React 的初衷！

另一个大的区别是函数式组件不会有状态依附，我下一个点就是讲...

# 4.  写无状态组件
不得不说，到目前为止，我觉得写 React 应用，最让我头疼的事都是由包含很多状态的组件引起的。
## 状态让组件很难测试
单纯的输入输出函数是最容易测试的，这点可以作为抛弃状态定义组件的理由吗？当我们测试很多状态的组件时，为了测试预期行为，我们必须先将组件设置为“正确的状态”。我们还必须考虑到所有的状态（因为组件可能在任意时刻改变这些状态）和属性（不受组件控制）组合，然后再去考虑那个组合需要测试，怎么测试。如果组件只是一个输入属性的处理函数，测试简直是不能更简单了。（关于测试，后面会讲）。
##  状态让组件很难推理（定位预期）
当你读一段代码中包含很多状态的组件，特别费劲，你需要在脑海中记录组件的状态。这些问题："状态有没有初始化？"，“如果我在这儿改变状态将会发生什么？”，“有几个地方改变了这个状态”，“这个状态是否存在条件竞争？”，这几个问题非常普遍。跟踪组件变化太蛋疼了。
## 状态让组件很容易引入业务逻辑
我们不应该搜索组件然后才能确定行为。记住，React 只是一个视图库，所以，把渲染逻辑丢在组件里面没问题，但是业务逻辑也丢里面就有问题了。但是呢，如果你的应用状态都在组件里面，那在组件内部访问这些状态就会很方便，这样就会诱使你把业务逻辑也丢在里面。回顾下刚说的那点，这么做单元测试怎么办 - 没有业务逻辑你没法测试渲染逻辑，反之亦然。
## 状态让组件很难与应用其它部分共享信息
父层组件的状态很容易传给下层组件，反过来就费事了。

当然，有时一个组件独立维护部分状态也是有必要的。在这种情况下，尽管放心使用 `this.setState` 。它也是 React 组件 API 合理的一部分，我并不想是让你觉得应该禁用它。比如，在用户输入时，不需要把每个按键都暴露给整个应用，应该保存自己的状态，在失去焦点之后，输入值会被派发到其它地方存储起来。这种场景是最近一个同事提到的，我觉得这个例子非常恰当。

为组件添加状态还是需要慎重。一旦你开始了，就很容易再加一个状态，不知不觉就不受你控制了。

# 5. 使用 Redux.js

上面第一点就已经说过，React 只是一个视图库。那么问题来了，“状态和逻辑放哪儿？”  我很高兴你会这么问！
你可能已经知道 Flux ，一种设计 web 应用的模式，在 React 开发中较为普遍。已经有几个基于 Flux 思想的实现，但是毫无疑问我推荐使用 Redux.js 。

我在考虑写一篇单独的博客，关于 Redux 的特性和优点。目前我推荐你读下官方文档，在这儿我只简单描述下它的工作原理：

1. 组件上的 UI 事件触发时，它们执行属性上传入的回调函数。
2. 这些基于事件创建的回调函数派发 actions
3. Reducers 处理 actions 并计算新的状态
4.  整个应用的新状态流入单一的 store
5.  组件接收新状态作为属性，在需要时重绘

上面的这些概念并非 Redux 独创，但是 Redux 的实现比较清晰简单。从 Alt.js 切换到 Redux ，减少了很多代码量，这儿简单列出比较突出的优点：

1. reducers 是纯函数，简单的 `oldState + action = newState`。每个 reducer 只处理一部分状态，这些状态可以组合起来。这么做，所有的业务逻辑和状态转换很容易测试。
2.  API 很少，很简单，文档清晰。非常容易学习这些概念，因此很容易理解项目中 actions 和 数据 的流动过程。
3. 按照推荐的方式使用，只有很少的组件依赖 Redux ; 其它的组件只接收状态和回调作为属性。这么做可以保持组件非常简单，减少框架同步。

这儿有几个库配合 Redux 非常爽，我也推荐你使用：

- [Immutable.js](https://facebook.github.io/immutable-js/) JavaScript 不可变数据结构！用它存储你的状态，可以确保状态不会在不该改变的时候改变，并且能够保障 reducer 足够纯洁。
- [redux-thunk](https://github.com/gaearon/redux-thunk) 当你的 actions 不只是更新应用状态，还有其他副作用时，就派上用场。比如，调用 REST API，设置路由或者派发其他 actions
- [reselect](https://github.com/reactjs/reselect)  用于可组合的，懒计算的情形。例如，对于部分组件，你可能想要:
 - 只注入整个状态树的相关部分，而非整个
 - 注入额外的衍生数据，比如总数或验证状态，而不需放在 store 中

 没有必要在最开始的时候就把这些全部引进来。当你开始有状态时，就可以引入 Redux 和 Immutable.js，有派生状态时引入 reselect，有路由或异步 actions 时引入 redux-thunk。尽早在必要时引入可以省去之后重构的时间。

Redux 是不是真正的 Flux，每个人都有自己的见解。个人觉得它符合 Flux 框架的核心思想，不过这个争论只是个语义问题。

# 6. 一直使用 propTypes

[propTypes](https://facebook.github.io/react/docs/reusable-components.html#prop-validation) 很容易为组件添加类型安全保障。他们看起来像这样：
```JSX
const ListOfNumbers = props => (
  <ol className={props.className}>
    {
      props.numbers.map(number => (
        <li>{number}</li>)
      )
    }
  </ol>
);

ListOfNumbers.propTypes = {
  className: React.PropTypes.string.isRequired,
  numbers: React.PropTypes.arrayOf(React.PropTypes.number)
};
```

在开发阶段（生产不会），如果任何组件没有给到必需的属性，或者所给的属性与声明的不匹配，React 会打印这些错误信息通知你。这有几点好处：

- 防止低级错误，捕获 bugs
- 如果你使用 `isRequired`，你就不需要检查 `undefined` 或 `null`
- 就像文档所说，列出组件的所有属性，省去阅读代码的人搜索整个组件。

上面的这些点，你可能似曾相识，静态类型支持者的论点。个人来讲，我通常喜欢动态类型带来的开发速度和舒适，但是我发现 propTypes 可以毫不费力的为我的组件添加一些安全感。坦白讲，没有理由不一直用它们。
最后一点是，任何 propType 错误时，让你的测试用例失败。下面这个例子有点简单粗暴的，不过可行：
```JSX
beforeAll(() => {
  console.error = error => {
    throw new Error(error);
  };
});
```

# 7. 使用浅渲染
测试 React 组件依然是有点棘手的话题。不是因为太难，而是因为还在发展，还没有出现一个最佳方案。目前来看，我的 go-to 方法是使用 [浅渲染](https://facebook.github.io/react/docs/test-utils.html#shallow-rendering)和属性断言。

浅渲染很好用，它允许你完整的渲染一个单一组件，而不涉及子元素的渲染。也就是说，结果对象只会告诉你子元素的类型和属性。这样子单一组件单一时间点可以提供很好的隔离。这儿有三种类型的组件单元测试，我自己也经常这么做：
## 渲染逻辑
假定一个组件，因条件不同，可能会显示一张图片，或者一个加载图标：
```JSX
const Image = props => {
  if (props.loading) {
    return <LoadingIcon/>;
  }

  return <img src={props.src}/>;
};
```
我们可以这么测试：
```JSX
describe('Image', () => {
  it('renders a loading icon when the image is loading', () => {
    const image = shallowRender(<Image loading={true}/>);

    expect(image.type).toEqual(LoadingIcon);
  });

  it('renders the image once it has loaded', () => {
    const image = shallowRender(<Image loading={false} src="https://example.com/image.jpg"/>);

    expect(image.type).toEqual('img');
  });
});
```
非常简单！当然，浅渲染的API 略微比我展示的复杂。上面使用的浅渲染函数是我们自己的 辅助方法，这个辅助方法包装了真正的 API，使用起来更简单一些。
回头看下我们的 `ListOfNumbers` 组件，下面是我们如何测试映射结果确实正确：
```JSX
describe('ListOfNumbers', () => {
  it('renders an item for each provided number', () => {
    const listOfNumbers = shallowRender(<ListOfNumbers className="red" numbers={[3, 4, 5, 6]}/>);

    expect(listOfNumbers.props.children.length).toEqual(4);
  });
});
```
## 属性转换
在最后的例子中，我们深入测试组件的子元素，确保它们被正确渲染。我们不止断言组件是否存在，同时检查所给的属性是否正确。当组件确实在传递属性之前根据属性做些转换时，这点特别有用。例如，下面这个组件接受一个字符串数组作为 CSS 类名，往下传递一个单引号空白分割的字符串：
```JSX
const TextWithArrayOfClassNames = props => (
  <div>
    <p className={props.classNames.join(' ')}>
     {props.text}
    </p>
  </div>
);

describe('TextWithArrayOfClassNames', () => {
  it('turns the array into a space-separated string', () => {
    const text = 'Hello, world!';
    const classNames = ['red', 'bold', 'float-right'];
    const textWithArrayOfClassNames = shallowRender(<TextWithArrayOfClassNames text={text} classNames={classNames}/>);

    const childClassNames = textWithArrayOfClassNames.props.children.props.className;
    expect(childClassNames).toEqual('red bold float-right');
  });
});
```
对这样方法最多的批判是激增的 `props.children.props.children` 。当然这不是最完美的代码，个人觉得如果一个测试中的 `props.children` 多的让人受不了，这说明这个组件太大了，太复杂了，嵌套太深。它可能需要拆分。
另外一点，我经常听说的是，你的测试太依赖你的组件内部实现，以至于稍微改变你的 DOM 结构都能导致你所有的测试崩溃。这的确是一个很公正的评论，脆弱的测试套件是每个人想要的最好件事。管理这些最好的方式是保持你的组件足够小，足够简单，应该控制因组件变更引起的测试崩溃数目。

## 用户交互
当然，组件不止展示，还有交互：
```JSX
const RedInput = props => (
  <input className="red" onChange={props.onChange} />
)
```
这是我最喜欢的测试方法：
```JSX
describe('RedInput', () => {
  it('passes the event to the given callback when the value changes', () => {
    const callback = jasmine.createSpy();
    const redInput = shallowRender(<RedInput onChange={callback}/>);

    redInput.props.onChange('an event!');
    expect(callback).toHaveBeenCalledWith('an event!');
  });
});
```
这只是一个例子，希望你能受到启发。
## 集成测试
上面我内容只覆盖到组件的独立的单元测试，但是你可能想确保你的应用各个部分协同工作，想在测试上走的更远。我对这部分了解的不够深入，但是列出一些基本点：
1. [渲染你的整个组件树](https://facebook.github.io/react/docs/test-utils.html#renderintodocument)（而非浅渲染）
2.  访问 DOM （使用 [React TestUtils](https://facebook.github.io/react/docs/test-utils.html) 或 [jQuery](https://jquery.com/) 等等）找到你最关系的元素，然后
  1. 断言元素的 HTML 属性和内容
  2. [模拟 DOM 事件](https://facebook.github.io/react/docs/test-utils.html#simulate)，然后断言产生的效果（DOM 或 路由变化，AJAX 调用等等）

## 关于测试驱动开发

一般情况下，写React 组件时我并不使用测试驱动开发。

在开发组件的时候，我发现我经常会去改动它的结构，我需要使用最简单的 HTML 和 CSS，在需要支持的浏览器上保持一致。因为我的组件单元测试方法大多会断言组件的结构，而测试驱动开发会使我在修改DOM时，忙于修复测试用例，这看起来有点浪费时间。
另外一个因素是组件足够简单以至于测试优先的有点基本消失。所有复杂的逻辑和转换都会丢在 action creators 和 reducers，这些地方我能真正享受到测试驱动开发带来的便利。
关于测试还有最后一点需要说明。整节内容我都在讨论测试组件，是因为测试基于 Redux 应用的其它部分没有特别之处。作为一个框架，Redux 背后还有些 ‘魔力’ ，可以减少对 mock 和其它测试模板的依赖。每个函数只是一个普通的函数（大多数是纯函数），测试起来真是如沐春风。

# 8. 使用 JSX, ES6, Babel, Webpack 和 NPM
只有 JSX 是 React 特有的。对我来说，JSX 是 `React.createElement` 的无脑操作。唯一的不足是增加了构建的复杂度，这个问题可以用 [Babel](https://babeljs.io/) 轻松搞定。
既然用了 Babel，那没理由不用 [ES6 特性](http://es6-features.org/)，像 常量，箭头函数，默认参数，数组和对象解构，延展和 rest 操作，字符串模板，迭代器和生成器，模块系统，等等。只要你花一点时间设置这个工具，你就能感受到 JavaScript 语言越来越成熟。
让我们做的更全面一些，使用 [Webpack](https://webpack.github.io/) 打包代码，使用 [NPM](https://www.npmjs.com/) 管理包。现在我们完全赶上了 JavaScript 的潮流 :)。


# 9. 使用 React 和 Redux 开发工具
谈到工具，React 和 Redux 的开发工具太赞了。[React dev tools](https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi?hl=en) 让你审查 React 元素的渲染树，在查看浏览器中结果时相当有用。Redux dev tools 更是[让人眼前一亮](https://www.youtube.com/watch?v=xsSnOQynTHs)，让你看到每个 已经发生的 action ，它们引起的状态变化，甚至给你回退的能力！你可以作为[开发依赖](https://github.com/gaearon/redux-devtools)，或者[浏览器扩展](https://chrome.google.com/webstore/detail/redux-devtools/lmhkpmbekcpmknklioeibfkpmmfibljd?hl=en)的形式使用。
你也可以用webpack设置热切换，保存代码时你的页面也会跟着更新-浏览器无需刷新。在调整组件和 reducers 时可以立即看到效果，大大提高开发效率。

就这些！
我希望在 React 入门上能带给你一个好的开端，帮你避免一些常见的错误。如果你喜欢这篇文档，可以关注我的[Twitter](https://twitter.com/camjackson89) 或者订阅我的 [RSS](https://camjackson.net/atom.xml) 。
