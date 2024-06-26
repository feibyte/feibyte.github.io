---
title: CSAPP 笔记
date: 2020-03-29 10:44:21
categories: ["学习笔记"]
tags: ["读书笔记", "CS"]
thumbnail: /gallery/thumbnails/csapp2.jpg
---

《深入理解计算机系统》这本书是 CS 的经典书目。翻看之处，思绪总是回到学校，感慨良多，也悔恨当年在学校没有好好学艺，更没有穷根究底的思考。整体来看的话，这本书更像是导论，所讲内容部分属于计算机组成原理，部分是操作系统，还有部分汇编。单从知识点上，这本书讲的并不全面，不过还是有不少收获。
<!-- more -->
在读此书之前，刷了一遍 CS50 的视频。如果没有 CS 的专业背景，非常推荐看下这个视频。

## 信息的表示

布尔代数和环，抽象代数。大学学过离散数学这门课，里面有部分讲到抽象代数，现在啥都不记得了。

### C 语言中的无符号数和有符号数
无符号数和有符号数可以互相复制，转换是隐式的。如果运算的两个数分别是有符号和无符号，C 将会隐含地转为无符号数。有些时候的运算结果是违反直接的，比如 `-1 < 0u` 结果为 `0`。 书中给了一个下面一个例子，当 length 为了时，直接抛出存储器错误。这是因为 length - 1 得到的是一个无符号数 0xffffffff。

```c
float sum_element(float a[], unsigned length) {
    int i;
    float result = 0;
    for (i = 0; i < length - 1; i++) {
        result += a[i];
    }
    return result;
}
```

解决的办法就是大多数语言禁用无符号数。

### 溢出问题
有些语言（python）自动处理了这个问题，自动转为大数类型并支持大数的运算。

### 浮点

以 32 位单精度浮点数为例，浮点数的表示形式为
[sign + exp + frac]
sign 符号位 1位， exp 指数为 8 位，frac小数位 23 位。指数偏移 Bias 为 127 = 2^7 - 1

根据 exp 值不同，有三种情况
规格化值：exp 即非全 0 也非 全 1 指数值为 e - Bias 小数值为 1.frac 
非规格化：exp 全 0 指数值为 1 - Bias
特殊值：exp 全 1 无穷以及 NaN

书中的示例 k = 4, n = 3, Bias = 2^3 -1 = 7

|描述|位表示|e|E|f|M|V|
|--- | --- | --- | ---| --- | --- | --- |
|0|0 0000 000|0|-6|0|0|0|
|最小的非规格化数|0 0000 001|0|-6|1/8|1/8|1/512|
||0 0000 010|0|-6|2/8|2/8|2/512|
|最大的非规格化数|0 0000 111|0|-6|7/8|7/8|7/512|
|最小的规格化数|0 0001 000|1|-6|0|8/8|8/512|
||0 0001 001|1|-6|1/8|9/8|9/512|
|最大的规格化数|0 1110 111|14|7|7/8|15/8|240|


通过这个例子，我们应该可以看出，从非规格化数到规格化数的平滑过渡。也是上面非规格化数取为 1 - Bias 而非 -Bias 的原因。
注意的是，即便 32 位浮点数表示的范围超过 32 位整数，同样的位数能够表示的数字是一样多的。超过一定范围之后，可以表示的整数将不再是连续的。有道习题是：给出不能够准确描述的最小正整数公式。答案是 2^(n + 1) + 1 这个数只跟 n 有关系，对于 32 位单精度浮点数来说就是 2^24 + 1 远小于 32 位整数的表示范围的。

### 浮点的舍入

1. 就近舍入 1.01111 舍入 1 位时就是 1.1 
2. 向偶数舍入（向下和向上同样距离），举个例子：1.01101 舍入 4 位时，可以选择向上  1.0111 或者向下 1.0110 向偶数舍入则选择 1.0110

这跟我们十进制的四舍五入可能会有不同表现：
1.445 舍入两位是 1.45  1.435 舍入两位是 1.43 原因是 1.43 离 1.435 要更近一些因为精度问题。
`1.435` 的二进制形式为 0x3fb7ae14, sign = 0, exponent = 0x7f, fraction = 0x37ae14 
`1.44` 的二进制形式为 0x3fb851ec, sign = 0, exponent = 0x7f, fraction = 0x3851ec 差 41944
`1.43` 的二进制形式为 0x3fb70a3d, sign = 0, exponent = 0x7f, fraction = 0x370a3d 差 41943


PS：C 和 JavaScript 得到的都是同样的结果。



最后，好奇为什么这么设计浮点数或者工程师们是怎么想到这样设计浮点数的。我们可以看到在数值比较小的时候密度比较大，能表示的精度也很高，这也是巧妙之处。一般人能想到表示浮点数的方法可能比较符合直觉：整数部分 + 小数部分。相比之下，孰优孰劣,自见分晓。


## 程序的机器级表示

这一章信息量很大，回顾 Intel 的体系结构，整数寄存器，汇编指令格式，寻址方式。

从寻址方式看，C 中的指针是很自然不过的存在，寄存器间接寻址，以及相对基址变址 `Imm(Eb, Ei, s)` 表示的地址是 `(Imm + R[Eb] + R[Ei] * s)`，可以满足很多情况下的指针运算，对于 (int*) 的指针 p++ 时 s = 4 只需简单的将 R[Ei] 加 1 即可做到。后面提到，对于基本类型的数组访问，s 都能满足。

之前学习的时候，汇编和 C 都是单独的课程，这一章将 C 编译成对应的汇编指令。 `if` `while` `for` `switch` 不再叙述。

函数调用和返回

`call` 指令只是将返回地址（当前 PC 值）入栈，然后跳转到被调用函数起始处。`ret` 则从堆栈弹出返回地址并跳转到那个位置。
寄存器使用惯例：寄存器 %eax %edx %ecx 被划分为调用者保存寄存器, %ebx, %esi 和 %edi (%esp %ebp) 被划分为被调用者保存寄存器。这个在后面的 csapp 实验中会非常有用，更多的使用惯例：https://en.wikipedia.org/wiki/X86_calling_conventions

书中的一个例子：

```c
int P(int x) {
    int y = x * x;

    int z = Q(y);

    return y + z;
}
```

GCC 可以将 变量 y 包括在寄存器中，以避免出栈入栈操作。

`esp` 一直指向栈顶，很少变化，`ebp` 一般在函数起始设置，便于寻找传递的参数。

```asm
pushq	%rbp
movq	%rsp, %rbp
//
// movl	8(%rbp), %eax
//
// 如果有使用需要恢复 %rsp    movq	%rbp, %rsp 
popq	%rbp
```

在堆栈上存储空间分配，随便写的一段代码，假设有四个变量。
```c
void call(int i) {
    int y = 3;
    int z = 4;
    int j = 8;
}
```

生成的汇编代码：

```x86asm
subq	$16, %rsp // 分配 4 * size(int) 空间
movl	%edi, -4(%rbp) // 把参数赋值给 i
movl	$3, -8(%rbp)
movl	$4, -12(%rbp)
movl	$8, -16(%rbp)
```

### 缓冲区溢出

书中的例子：
```c
void echo() {
    char buf[4];
    getBuf(buf);
}
```
堆栈上只分配了 4 个字节给 buf, 如果 `getBuf` 写入的超过 4 个字节就会出现缓冲区溢出 `buffer overflow`。栈顶存放的是返回地址，所以很容易被攻击。本书设计的实验 `Attack Lab` 就是让你利用这个漏洞进行攻击。简单来说就是覆盖返回地址，可以是当前堆栈，然后在堆栈上放置自己的指令。现在的操作系统和编译器也有一些应对之法：随机栈（栈地址不再是连续的），栈破坏检测，限制可执行代码。即便不能执行堆栈上指令，也可以利用 ROP 攻击。本身是因为返回地址还在堆栈上，可以让它指向我们想要执行的代码片段，可利用的代码片段通常是以 `ret` 结尾，可以拿回控制权，所以称为 ROP (Return-oriented Programming)。


## 处理器体系结构

大部分篇幅都在讲指令流水，这倒不陌生。

寄存器文件的两个写端口允许每个时钟周期更新两个程序寄存器，可以用特殊端口，不选中寄存器。
原则：不会为了完成一条指令的执行而去读由该指令更新的状态
反例：push 先将 %esp 减 4 再将更新后的 %esp 值作为写地址。

书中的图片 4.39 和 4.41 解释了很多内容。除了控制指令之外，写回阶段也可能存在冲突，这个是数据相关性问题，还有一个问题是取指和访存也可能相关。数据冒险类型：程序寄存器；程序计数器（控制转移）；存储器和取指。

避免数据冒险

暂停，在解码阶段暂停，插入 nop 

转发，不必等到写回阶段，不能处理加载使用。还是需要等待上条指令的访存写回结束。


还有很多指令流水的细节在之前可能没有接触过。


## 优化程序性能

这一章非常实用。编译器优化不能改变代码的行为，书中第一个例子很有启发性：

```
void twiddle1(int *xp, int *yp) {
    *xp += *yp;
    *xp += *yp;
}
void twiddle2(int *xp, int *yp) {
    *xp += 2 * *yp;
}
```
如果 xp == yp 这两个函数的结果可能会不同，编译器必须假设不同指针可能指向同一位置。


妨碍优化的因素：存储器别名使用；函数调用（无法确定一个函数是纯函数）

1. 消除循环的低效率：移动代码（只需执行一次的代码）只是运算的话编译器优化就可以做到。
2. 减少过程调用
3. 消除不必要的存储器引用
4. 提高并行性
5. 循环分割
6. 寄存器溢出（不足）

在做对应的实验的时候，因为环境的原因（较高的GCC 版本7.5.0以及本地机器配置更好），编译器优化的结果都比基准测试高很多，即使是同样的代码性能也比别人的高出一倍。
实验中的一些发现：
1. 可能因为缓存的原因，第一个函数调用耗时较长，注意多注册一次进行对比。
2. 简单的运算编译器已做优化，没必要人工避免重复运算。
3. 即便在循环内消除简单的函数调用（max, min），也不会带来明显提升，可能是编译器已对此类函数进行了优化，也可能是函数本身开销很小，参数寄存器足够，只有返回地址进栈出栈。
4. 循环内消除复杂的函数调用（avg）提升明显。
5. 循环分割几乎对性能没有改进

优化必须定位到瓶颈


## 存储器层次结构

这一章的内容比较熟悉，不确定现在的存储器性能与 CPU 相比是否差距在缩小，书上的数据截止到 2000 年。检查了下自己的机器：
Memory LPDDR3 的速度是 2133 MHZ  CPU 是 2.9GHZ，硬盘的数据看不到。这样看的话，差距并没有在继续拉大。

局部性（空间和时间），可以说层次结构就是建立在局部性之上的。


## 链接
这一部分内容不熟，所以整个记录下。
假设我们有这样的两个 c 文件：
```c
//main.c
void swap();
int buf[2] = {1, 2};
int main() {
    swap();
    return 0;
}
```
```c
//swap.c
extern int buf[];
int *bufp0 = &buf[0];
int *bufp1;
void swap() {
    int temp;
    bufp1 = &buf[1];
    temp = *bufp0;
    *bufp0 = *bufp1;
    *bufp1 = temp;
}
```
运行 `gcc -v -O2 -g -o p main.c swap.c` 可以发现先是生成了两个目标文件 `main.o` 和 `swap.o`，然后 `ld` 将两个文件链接起来。

链接器就是以一组可重定位目标文件为输入，生成一个可执行文件。
为了创建可执行文件，链接器的任务：
1. 符号解析
2. 重定位

### ELF 可重定位目标文件

ELF 头部
.text 已编译程序的机器代码
.rodata 只读数据
.data 已初始化的全局 C 变量，局部变量在运行时被保存在栈中，即不在.data 也不在.bss
.bss 未初始化的全局 C 变量，在目标文件不占用空间
.symtab 符号表 存放在程序中被定义和引用的函数和全部变量信息
.rel.text 
.rel.data
.debug 调试符号表
.line C 代码行号和.text机器指令之间的映射，调试使用
.strtab 字符串表


符号表中每个表目：
```
int name: 字符串表中偏移
int value: 对应节中偏移
int size: 大小
char type:4 (data, func,)
    binding:4;
char section: 节头索引
```

从这儿可以看出，符号表的建立主要是链接需要，本地变量是不在符号表上的。如果一个符号没有在当前模块定义，编译器会假定它定义在其它模块。如果有多个定义，要么抛错，要么选择一个。规则是不允许有多个强符号（函数和已初始化的全局变量），可以有多个弱符号（未初始化的全局变量）。

### 静态库

在编译的时候，并不检查某个函数是否在外部已经定义。在链接的时候就需要指定目标函数的模块了，但是对于标准函数来说，一一指定也太过复杂。静态库可以理解为一组目标文件，毕竟我们在执行链接的时候也不希望一个一个指定依赖的模块。如果所有的标准函数打包成一个大的目标文件，然后进行链接，每次生成得到可执行文件都太过庞大和臃肿。在与静态库链接的时候可以只从中只取需要的文件，整个过程就是维护一个集合：可执行文件和未定义符号，对于目标文件来说直接就链接了，对于归档文件，尝试匹配为定义符号，如果某个存档成员 m 定义了该符号，将其添加进来。继续扫描，直到集合不再变化。如果最后集合依然含有未解析符号，那就抛出错误。这儿就要注意，库和目标文件的顺序是有影响的，不难理解。在 windows 下静态库文件是 `**.lib` 而 linux 下是 `**.a` 。
可用命令 `objdump -a /usr/lib/某个路径/libc.a` 查看静态库文件包含的目标文件。

### 重定位

完成符号解析之后，接下来开始重定位，首先合并模块，并为每个符号分配运行时地址。重定位分两个步骤：
1. 重定位节和符号定义。将目标文件中的相同节合并成为同一类型的新节。
2. 重定位节中的符号引用。

第一步不难理解。现在说说第二步，我们上面说了编译代码的时候不关心外部定义的，但是如果我们调用一个外部函数，怎么确定它的地址呢？现在已经编译成 `call address` 的机器指令了的。如果我们之前没留空了，现在就需要补上了。要正确的补空，就需要重定位表目这个东西。

重定位表目
代码的重定位表目：.relo.text 数据的在 .relo.data 里面的条目格式也简单
```c
typedef sturct {
    int offset; // 在节中的偏移
    int symbol: 24 //
        type: 8;
} Elf32_Rel;
```

### 可执行目标文件
链接器生成的可执行目标文件和之前介绍的可重定位目标文件相似， `.init` 节定义了一个小函数，初始化代码会调用。当然刚说的 .relo 节不再需要了。还有一个段头表值得一说：
```
LOAD off    0x0000000000001000 vaddr 0x0000000000401000 paddr 0x0000000000401000 align 2**12
         filesz 0x00000000000001cd memsz 0x00000000000001cd flags r-x

```
off 文件偏移， vaddr/paddr 虚拟/物理地址 ，align 段对齐，filesz 目标文件段大小，memsz 存储器中段大小，flags 运行时许可。

### 加载可执行目标文件

shell 会调用加载器来运行它。默认情况下，代码段是从 0x8048000 开始（32位）， 0x400000 （64 位），当然可以链接时可以指定。这儿应该有一张图，linux 运行时存储器映像。从 0x8048000 往上包括，只读段，读写段，运行时堆（malloc 创建），0x40000000 共享库，0xc0000000 往下是用户栈，往上是内核虚拟区。

![linux 运行时存储器映像](/gallery/site/linux-memory.png)

更多阅读《程序员的自我修养-链接、装载与库》

### 动态链接共享库
静态库的缺点很明显：无法共享，必须重新链接才能更新。
共享库可以在运行时加载到任意地址，这个过程叫动态链接。（window 下 .dll 文件， Unix 下 .so 文件）


### PIC 与位置无关的代码
上面讲的重定位技术，会修改代码段的引用，这样做需要链接器修改代码。如果代码是位置无关的，就可以在任意地址加载和执行这些代码。PIC 就是把这些需要修改的空移到数据段上，在数据段开始的地方创建了一个全局偏移量表 GOT。这个实现起来也不难，就是看你需要 5 条指令而不是一条。
PIC 函数调用也需要几条指令拿到地址然后调用函数，为了节省指令，编译系统使用延迟绑定，将过程地址的绑定推迟到第一次调用该过程时。第一次调用过程的开销很大，但是其后的每次调用只需要一条指令和一个间接的存储器引用。为了实现延迟绑定，需要过程链接表 PLT，说白了就是第一次结束之后修改 GOT 的跳转位置。在反编译的时候可以看到有很多这样的条目。

```s
0000000000400cb0 <strcpy@plt>:
  400cb0:	ff 25 6a 33 20 00    	jmpq   *0x20336a(%rip)        # 604020 <strcpy@GLIBC_2.2.5>
  400cb6:	68 04 00 00 00       	pushq  $0x4
  400cbb:	e9 a0 ff ff ff       	jmpq   400c60 <.plt>
```

## 异常控制流

## 虚拟存储器
这个更熟悉不过了，这个设计也很精妙。


在读这一章的时候，我在想，这些需要软件和硬件配合的设计在最开始整个系统由一个人设计的时候可能会出现。在现在分工越来越高的情况下，估计很难再出现这样的设计了。

## 程序间的交互
整个第三部分都很熟悉,这儿只是简单讲解了系统IO，网络编程，并发编程。