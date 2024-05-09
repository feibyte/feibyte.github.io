---
title: Athena in IntelliJ IDE
date: 2024-04-28 22:38:49
categories: ["实践总结"]
tags: [AWS, 工具]
thumbnail: /gallery/thumbnails/intellij.png
---
目前在一个 Start up 公司 Serviceless 架构，数据库使用 DynamoDB，每天定时任务会导入数据湖，所以平时会经常使用 Athena 查询来排查问题，尤其是最近在调查数据一致性的问题。Athena 本身可以满足日常需求，只是使用多的时候觉得不如 IDE 方便。

## 问题

我使用的是 IntelliJ IDEA （已经更新到最新版了），直接选择 Database 添加 Data Source 选择 AWS Athena 看到的是下面这个界面，授权方式有三种： User & Password AWS Profile No auth 我们使用的是 SSO 应该选择 No auth 切换到 Advanced 参数不知道怎么设置

![配置数据源](/gallery/site/intellij/idea1.png)

谷歌上找到两遍文章 Using AWS Athena from IntelliJ-based 太旧，这个 Configure JetBrains IntelliJ AWS Athena data source using JDBC driver 倒是指明了思路。查看了一下当前自带的驱动版本是 2.x，查看文档参数时发现 Connecting to Amazon Athena with JDBC 版本 3.x 的文档很简单，不如直接使用 3.x。

![驱动版本](/gallery/site/intellij/idea2.png)

## 步骤

1. 下载和添加驱动 Connecting to Amazon Athena with JDBC
2. 创建数据源，配置参数，参见文档 AWS configuration profile credentials 非常简单
> ![配置参数](/gallery/site/intellij/idea3.png)
3. 测试链接

## 最后效果

![查询结果](/gallery/site/intellij/idea4.png)

还可以切换到可视化

![可视化](/gallery/site/intellij/idea5.png)