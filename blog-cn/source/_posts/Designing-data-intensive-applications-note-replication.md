---
title: 《Designing Data Intensive Applications》读书笔记 - 数据库复制
date: 2024-07-16 23:17:22
categories: [学习笔记]
tags: [DataBase]
thumbnail: /gallery/thumbnails/2024/designing-data-intensive-applications-book.png
---

这一章讲数据库复制（Replication），目标很简单就是保存数据副本在多个机器上，但是实现却没那么容易。首先需要数据复制的几个原因：
1. 数据中心地理上更靠近用户
2. 增强可用性，即便部分服务器节点失败，整个系统依然可用
3. 提高读取的吞吐量

<!-- more -->

本章讨论三种算法：单个主库（single leader），多个主库（multiple leader），无主库（leaderless）

## 主从 (Leaders and Followers)
存储数据库拷贝的节点称为副本 （replica），当有多个副本时，问题来了：如何确保所有的数据最终在所有的副本上？最常见的方案是主从复制：
1. 一个副本被设计为主库（leader），客户端写入时发送请求到主库或主节点，主节点先将数据存储到本地
2. 在读库写入数据之后，同时发送数据变更到所有的从库，从库相应的更新本地拷贝
3. 客户端读取数据时，可从主库或任意的从库查询

### 异步复制还是同步复制

同步复制可以保证和主库的一致，缺点是如果从库没有响应，主库必须阻塞所有的写入直到同步复制可用。
因为这个原因，将所有的从库都设置为同步不太实际，任何一个节点故障都能造成整个系统停止（halt）。实际应用中，如果你启用同步复制的功能，只是意味着只有一个从库是同步的，其他都是异步的。这保证至少有两个节点有最新数据，有时这个配置又称为半同步。
更常见的是设置为完全异步这种情况下，如果主库挂掉而且无法恢复，未完成同步的写入数据就会丢失，即便客户端已经确认写入，也不能保证（确认的写入）的持久性。
但是完全异步的好处是主库可以继续处理写请求，即便所有的从库更新数据都落后了。

弱的可持久性听起来是一个不好的取舍，尽管如此异步仍被广泛应用，尤其是从库数量很多或者是地理上分布很广的情况。

### 设置新从库
1. 主库创建快照
2. 复制到从库
3. 从库连接到主库，请求之后的数据变更
4. 一旦完成 `caught up` 可以继续处理主库发送的数据变更

### 处理节点故障

**从节点失败**
从节点崩溃重启，可以连接主节点，请求连接断开期间所有的数据变更

**主节点失败**
主节点失败稍微复杂，其中一个从节点需要提升为主节点，客户端需要重新配置发送请求到新的主节点，其他从节点需要开始消费来自新主节点的数据变更。
自动的 `failover` 步骤:
1. 确定主节点失败
2. 选举新的主节点
3. 重新配置系统使用新的主节点

可能出错的情况：
1. 如果使用异步复制，新的主节点可能没有收到来旧主节点的所有数据
2. 在与外部存储系统协作时，丢弃写尤其危险。Github 故障，自增 ID 在新主库上导致使用已分配的 ID，但是 Redis 有之前的缓存，导致用户数据泄露。 
3. 在一些情况下可能两个节点都认为自己上主库 （split brain）
4. 主库死亡的 timeout 时长；如果太长恢复时间就会比较长，如果太短可能引起不必要的 `failover`
   
这些问题：节点失败，网络不可靠，副本一致性取舍，可用性和延迟都是分布式系统中的基本问题。


## 实现复制日志


### 基于语句的复制
在最简单的例子中，主节点将执行的请求语句直接发送到从节点。
这种方法存在一些问题：
1. 任何生命语句里面包含有非决定性的函数，比如当前时间，随机数，都可能产生不同的复制数据
2. 如果语句使用自增列，它可能依赖于既有数据，需要保证他们的顺序
3. 如果语句有副作用，可能会引起不一样的副作用

### WAL shipping

存储引擎已经有的 WAL 日志，将它发送给其他节点比较容易实现。问题是这个日志和存储耦合

### 逻辑日志复制
这种更像是中间路线，与存储引擎引擎解耦


## 复制延迟问题

### 读自己写（Reading Your own Writes）
实现读后写一致性的方案：
1. 对用户可能修改过的数据，从主节点读取
2. 最后更新在1分钟之内的数据，从主节点读取，否则同从节点，同时监控从节点不会落后主节点 1 分钟以上
3. 客户端知道最近写的时间戳，根据这个时间从节点可以知道落后的进度，可以等待从节点 `caught up` 或交给其它从节点处理


### Monotonic read
让用户觉得时光倒流的情景，实现单调读的一种方案是确保每次都读从相同的从库读


## 多个主库复制 （Multi-Leader Replication）

多数据中心地理上分布在不同位置时，相比较单leader
1. 性能上更好
2. 能够容忍数据中心出错
3. 可以容忍网络问题

但是需要处理冲突问题


### 处理写冲突
1. **异步或者同步冲突检测** 理论上可以同步，那样就没必要使用多个主库
2. **冲突避免** 最简的办法就是避免冲突，确保来自给定用户的请求，由相同的数据中心相同主库处理
3. **一致状态收敛** 当数据中心处理写冲突时，写入的顺序在不同节点可能不一致，如果按照时间处理，可能最后导致不一致，所以解决冲突需要一种收敛的方式。比如对于每个写都有一个唯一的 ID，冲突时最高 ID 获胜。这种方法很常见但是很可能会导致数据丢失。
4. **冲突解决逻辑** 写入时解决 读取时解决

### 多主库拓扑结构
最基本的就是 all to all，每一个主节点都发送写入到其他的主节点。
更严格的拓扑是环形拓扑（MySQL 默认只支持环形）

## 无主库复制 （leaderless replication）
客户端直接发送写请求到多个副本

### 一个节点故障时写入数据库
客户端并行发送请求到所有的服务节点

### 读修复和反熵

1. **读修复** 客户端的读取的时候，从多个节点并行读取时数据时可以检测到旧的响应数据。客服端发现后，将新值写入该副本。适用于读频繁的值
2. **反墒**  后台程序去持续的检测副本之间的不同，并且复制丢失数据到副本

### 读和写的法定人数 （Quorums of reading and writing）

一般来说，如果有 n 个节点，每个写必须被 w 个节点确认，读取从 r 个节点查询。只要 `w + r > n` 我们就能读取到最新的数据。

即便满足上面的条件，仍然有些局限：
1. sloppy quorum 可能存在写的节点和读的节点没有相同节点
2. 如果两个并发写发生，并不清楚哪一个先后
3. 如果发送并发读和写，写可能只反映在某些副本上，并不确定读返回新的还是旧的数据？
4. 如果写部分成功部分失败，但是不满足上述条件，在成功节点上没有回滚。这意味着即便写入失败，后续的读依然可能会返回之前写入的数据
5. 如果一个有新数据节点挂掉，然后又从一个旧数据节点恢复，可能就会违背了之前的条件
6. 即便所有的都运行正常，也可能会有时序的问题


### Sloppy Quorums and Hinted Handoff
如果出现网络故障，大部分节点可能都会无法连接客户端，这可能导致不能满足法定人数条件，但是只有少部分节点可用，可用这个时候就需要做些取舍
1. 直接返回错误，因为不满足这个法定人数条件
2. 接受写，在网络恢复之后再将写入发送给这些节点。一个类比就是你把自己锁在房子外面了，然后你可以去邻居家沙发上睡一晚，一旦你找回钥匙，你的邻居要求你回去。

### 检测并发写
之前说过，最新写胜出是以写丢失为代价来解决写冲突的。
怎么才能决定两个操作是并发的呢？还是有先后顺序的呢？取决于他们是否知道另一个操作的存在
检测先后关系的方案：
1. 维护一个版本号和数据一起写入
2. 读取时返回所有没有被覆盖的数据，客户端必须先读再写
3. 客户端写入时，必须加上先前版本并合并先前版本的数据
4. 服务端接收到写请求，可以覆盖低版本号的数据，但必须保留高版本的数据

## 最后
这一章讲了数据库复制，主从，多主，无主库的实现，以及一些冲突解决的方案。这一章的内容比较多，但是都是比较基础的内容，对于分布式系统的理解有很大的帮助。
有时间可以看下分布式的课程了。
