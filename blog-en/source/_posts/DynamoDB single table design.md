
title: DynamoDB the Advantages and Considerations of Single Table Design
date: 2024-06-02 21:22:56
categories: [Explorations]
tags: [Serviceless, DynamoDB]
thumbnail: /gallery/thumbnails/2024/dynamodb.png

---

Developers familiar with Relational Database design often find themselves initially drawn to the familiar territory of normalization when designing data models for DynamoDB. This instinct typically leads them towards what's known as multi-table design, where each entity or relationship resides in a separate table.

On the other hand, DynamoDB's schemaless nature encourages a different approach: single-table design, where all entities and relationships coexist within a single table. However, it's worth noting that these two designs represent extremes on a spectrum, rather than strict boundaries.

According to the [official documentation](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/data-modeling-foundations.html), single-table design is often recommended. This article explores the advantages of single-table design based on practical experience.

Our project predominantly utilizes single-table design, largely influenced by 《The DynamoDB Book》, authored by advocate Alex DeBrie. Despite our commitment to single-table design, we still manage more than a dozen tables, albeit with a focus on storing related entities together.


<!-- more -->

## Advantages of single table design

### 1. Data Locality for Efficient Queries
Single-table design allows for fetching multiple entity types in a single database call, reducing requests, improving performance, and cutting costs. However, realizing this advantage in practice requires deliberate structuring, as applications often overlook underlying implementation details.

In the table below, user information and order information use the same `Partition Key`, in the same `itemCollection`, you can get user information and order information in one `Query` request.

![single-table.png](/gallery/site/2024/single-table.png)

The problem in reality: realizing this advantage in practice requires deliberate structuring, as applications often overlook the underlying implementation details.
In practice, we don't care about the order of entity types in the same `itemCollection`, usually still keep 2 requests for different entities each in same `itemCollection`.

### 2. Reduces overall financial and latency costs of reads:
> A single query for two items totalling less than 4KB is 0.5 RCU eventually consistent
> Two queries for two items totalling less than 4KB is 1 RCU eventually consistent (0.5 RCU each)
> The time to return two separate database calls will average higher than a single call

The advantages of the bill are quite obvious: reducing the number of requests naturally reduces the cost of the bill, usually a single entity record will not be very large, and multiple entity records may not necessarily have 4KB.
The advantage of latency is also easy to understand, a single request is usually faster than two separate requests.

However, this advantage based on assumptions that you can save another request call, which is not always the case in practice.

### 3. Reduces the number of tables to manage:
> Permissions do not need to be maintained across multiple IAM roles or policies
> Capacity management for the table is averaged across all entities, usually resulting in a more predictable consumption pattern
> Monitoring requires fewer alarms
> Customer Managed Encryption Keys only need to be rotated on one table

Permissions do not need to be maintained across multiple IAM roles or policies, which also means that the granularity of permissions is not so fine. In practice, we already feel that our permissions are too fine, and each Lambda has different role permissions.
These advantages are real, single-table design is easier to manage, does not require more configuration, and does not require access permissions for each table in each Lambda.

### 4. Smooths traffic to the table:
> By aggregating multiple usage patterns to the same table, the overall usage tends to be smoother (the way a stock index's performance tends to be smoother than any individual stock) which works better for achieving higher utilization with provisioned mode tables
Not much to say, the advantage is not obvious in practice


## Disadvantages

1. Learning curve can be steep due to paradoxical design compared to relational databases
   Understanding the fundamental principles of DynamoDB, grasping the single-table design concept isn't overly complex. However, there are associated trade-offs to consider, and the learning curve isn't particularly steep. In our experience, incorporating a new entity type into an existing table proves far simpler than introducing a new table altogether.
2. Data requirements must be consistent across all entity types
3. All changed data will be propagated to DynamoDB Streams even if only a subset of entities need to be processed.
4. When using GraphQL, single table design will be more difficult to implement
5. When using higher-level SDK clients like Java's DynamoDBMapper or Enhanced Client, it can be more difficult to process results because items in the same response may be associated with different classes

## Summary
DynamoDB's flexibility allows for a spectrum of design choices, with no strict delineation between single-table and multi-table approaches. Advocates typically recommend a per-service table, challenging developers to break free from the relational database mindset.

Understanding DynamoDB's core concepts is essential. From there, the choice between single-table and multi-table design should align with specific project requirements.


For further exploration:
1. [Single-table vs. multi-table design in Amazon DynamoDB
](https://aws.amazon.com/blogs/database/single-table-vs-multi-table-design-in-amazon-dynamodb/)
2. [Single table design for DynamoDB: The reality](https://www.gomomento.com/blog/single-table-design-for-dynamodb-the-reality)
3. [The What, Why, and When of Single-Table Design with DynamoDB](https://www.alexdebrie.com/posts/dynamodb-single-table/)