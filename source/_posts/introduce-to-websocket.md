---
title: introduce to websocket
date: 2017-08-31 13:32:17
tags:
---

## 背景

在 webSocket 出现之前，为了实现消息推送，实现方式有轮询和Comet。Comet 又分两种：长轮询和流技术。

<!-- more -->

## webSocket API
webSocket 使用非常简单，API 比较简单：
```js
const ws = new WebSocket('ws://localhost:8080');
ws.onopen = function() {};
ws.onmessage = function() {};
ws.onclose = function() {};
ws.send('');
ws.close()
```

## 握手
webSocket 需要借助 HTTP 协议，如果是 https 协议，则使用 wss 协议

```http
GET ws://dw-dev.alibaba-inc.com:8080/sockjs-node/056/yqjbei0m/websocket HTTP/1.1
Connection: Upgrade
Upgrade: websocket
Sec-WebSocket-Version: 13
Sec-WebSocket-Key:PnmANvXSAsaE+HljkwpFLA==
Sec-WebSocket-Extensions: permessage-deflate; client_max_window_bits
```

```http
Connection: Upgrade
Upgrade: websocket
Sec-WebSocket-Accept:y2AYVF5ss1DbiA0wKhARD3d37fw=
```

服务端代码 Node.js 实现：
```js
const server = http.createServer();
server.on('upgrade', (req, socket) => {
  const secKey = req.headers['sec-websocket-key'];
  socket.write('HTTP/1.1 101 Web Socket Protocol Handshake\r\n' +
               'Upgrade: WebSocket\r\n' +
               `Sec-WebSocket-Accept: ${calcAcceptHash(secKey)}\r\n` +
               'Connection: Upgrade\r\n' +
               '\r\n');
});
```

服务端必须返回 Sec-WebSocket-Accept，否则浏览器将抛出错误。 Sec-WebSocket-Accept 的计算方法是 原 key 与 '258EAFA5-E914-47DA-95CA-C5AB0DC85B11' （魔数）字符串拼接再取 sha-1 哈希值的 base64 编码。代码描述：
```javascript
const MAGIC_STRING = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
crypto.createHash('sha1').update(secKey + MAGIC_STRING).digest('base64');
```

另外，服务端可以拒绝同一客户端的多个连接以避免 DOS 攻击。

## 数据帧

```
   0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
  +-+-+-+-+-------+-+-------------+-------------------------------+
  |F|R|R|R| opcode|M| Payload len |    Extended payload length    |
  |I|S|S|S|  (4)  |A|     (7)     |             (16/64)           |
  |N|V|V|V|       |S|             |   (if payload len==126/127)   |
  | |1|2|3|       |K|             |                               |
  +-+-+-+-+-------+-+-------------+ - - - - - - - - - - - - - - - +
  |     Extended payload length continued, if payload len == 127  |
  + - - - - - - - - - - - - - - - +-------------------------------+
  |                               |Masking-key, if MASK set to 1  |
  +-------------------------------+-------------------------------+
  | Masking-key (continued)       |          Payload Data         |
  +-------------------------------- - - - - - - - - - - - - - - - +
  :                     Payload Data continued ...                :
  + - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - +
  |                     Payload Data continued ...                |
  +---------------------------------------------------------------+
```

1. 数据长度可变；第二字节标示的 len 为 126 时，后面 16 位作为 payload 长度。如果为 127，用后面 64 位。
2.  Mask 如果是客户端发送则必需。浏览器随机生成掩码，避免随意伪造发送内容。


```js
var DECODED = "";
for (var i = 0; i < ENCODED.length; i++) {
    DECODED[i] = ENCODED[i] ^ MASK[i % 4];
}
```

opcode 4位
0x0 denotes a continuation frame
0x1 denotes a text frame
0x2 denotes a binary frame
0x8 关闭
0x9 (Ping)
0xA (Pong)
其它保留

## 应用

[webpack-dev-server](https://github.com/webpack/webpack-dev-server) 断开重连-指数退避算法
[webpack-hot-middleware](https://github.com/glenjamin/webpack-hot-middleware) [SSE](https://www.html5rocks.com/en/tutorials/eventsource/basics/)

## ReadMore

[aboutwebsocket](https://www.websocket.org/aboutwebsocket.html)
[Writing_WebSocket_servers](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_servers)
服务端实现全部代码可以参考 留香的 [easy-websocket](https://github.com/vincentLiuxiang/easy-websocket)
