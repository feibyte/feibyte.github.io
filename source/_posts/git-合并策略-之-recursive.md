---
title: git 合并策略 之 recursive
date: 2017-02-22 11:52:04
tags:
---
前几天老婆大人考察：git merge 时什么情况下进行 auto merge 以及如何 merge ? 我只能回答：如果文件同一行都有修改就会冲突，如果没有冲突就会自动 merge 。另一个问题是：如果一个文件删除了，为什么 merge 时还存在？这个应该是在另一个分支上对该文件做了修改。在阅读后面的文章之前，假定你理解 git 的分支是由 commit 串起来的一条链。如果不明白上一句话，请先补下 [git 分支](http://git.oschina.net/progit/3-Git-%E5%88%86%E6%94%AF.html#3.2-%E5%88%86%E6%94%AF%E7%9A%84%E6%96%B0%E5%BB%BA%E4%B8%8E%E5%90%88%E5%B9%B6) 知识点。

<!-- more -->

从 auto merge 说起，在我们合并两个分支时（不讨论 Fast-forward），如果两个分支没有冲突，经常会看到下面这句输出：
`Merge made by the 'recursive' strategy`
从 [merge-strategies](https://git-scm.com/docs/merge-strategies) 文档中可以看到在 git 合并分支时可以指定合并策略，而 `recursive` 是默认的策略，该策略使用 3路合并算法。

## three-way merge
为方便解释，我们新建一个 git 仓库，在 master 分支新建一个 animals.txt，在 animals.txt 中添加这么几行内容：
```plain
cat
dog
octopus
```
第一个提交 commit 记为 B，然后切出一个分支 dev，在 dev 分支修改  octopus 为 tigger，commit 记为 E，在文件最后一行后插入一条 elephant，commit 记为 F；切回 master 分支，在文件第一行前插入一条 mouse，commit 记为 C, 修改 octopus 为 cow 记 commit 为 D。分支结构如下：
```plain
B-C-D  master
 \
  E-F dev
```
其中 master 分支文件内容：
```plain
mouse
cat
dog
cow
```
dev 分支文件内容：
```plain
cat
dog
tigger
elephant
```
如果直接对两个文件进行 diff，我们是不知道如何进行 merge 的。因此我们就需要以原文件为参照进行三路合并。现在在 master 分支上执行 `git merge dev` ，需要进行三路合并的就是 B、D、F 这三个 commit。三路合并状态如下：

<img src="http://7xwjvd.com1.z0.glb.clouddn.com/3way-merge.png"  alt="3way-merge" width="400">

除了需要手动解决的冲突，三路合并很符合我们的期望。需要注意的是，三路合并只关心三个点，至于分支的历史它是不关心的。假设 dev 分支 commit F 中 tigger 改回 octopus，最后合并的结果是 cow。

## recursive 又是什么？
刚刚的三路合并提到了公共祖先，如果两个分支不止一个公共祖先怎么办？下面的希望你看明白了。 merge D 和 F时，发现 C 和 E 都是它们的公共祖先，而且这两个祖先还没有先后之分。如下：
```plain
B--C---D  master
 \  \ /
  \ / \
   E---F dev
```
合并的策略是先合并 C 和 E 得到一个虚拟的公共祖先 G，再把这个虚拟节点作为公共祖先进行合并。那如果合并 C 和 E 的时候发现他们的公共祖先也不止一个怎么办？所以就要递归进行了。查询公共祖先的方法见 [git-merge-base](https://git-scm.com/docs/git-merge-base)

好了，问题来了。如何实现 merge base?（提示：优先级队列）

至此，如果上面有叙述不清楚的地方，可以直接阅读下面的两个文章
1. [three-way-merge](http://www.drdobbs.com/tools/three-way-merging-a-look-under-the-hood/240164902?pgno=1)
2. [merge-recursive-strategy](http://blog.plasticscm.com/2011/09/merge-recursive-strategy.html)
