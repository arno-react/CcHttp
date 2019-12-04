# CocoWXHttp Node SDK

[![License](https://img.shields.io/npm/l/ccwxhttp.svg)](LICENSE)
[![NPM](https://img.shields.io/npm/v/ccwxhttp.svg)](https://www.npmjs.com/package/ccwxhttp)
[![NPM Downloads](https://img.shields.io/npm/dt/ccwxhttp.svg)](https://www.npmjs.com/package/ccwxhttp)

本项目为Coco机器人 的 安卓微信机器人web插件 HTTP API 插件的 Node SDK，封装了 web server 相关的代码，让使用 Node.js 的开发者能方便地开发插件。

关于 Coco机器人插件 HTTP API 插件，见 [地址](http://www.svnhost.cn/doc/mc/%E5%AE%89%E5%8D%93%E5%BE%AE%E4%BF%A1%E6%9C%BA%E5%99%A8%E4%BA%BA%E6%8F%92%E4%BB%B6%E5%BC%80%E5%8F%91-2.html)。

## 用法

首先安装 `ccwxhttp` 模块：

```bash
npm install --save ccwxhttp
```

然后在程序中使用：

```es6
const CcHttp = require('ccwxhttp');

const bot = new CcHttp({
    apiRoot: 'http://127.0.0.1:5700/',
    accessToken: '123',
    secret: 'abc'
});

bot.on('ReceiveMessage', context => {
    bot.SendMessage(context.FromId, '哈喽～')
});

bot.listen(8080, '127.0.0.1');
```

更详细的示例请参考 [`demo.js`](demo.js)。

### 创建实例

首先创建 `ccwxhttp` 类的实例，传入 `apiRoot`，即为Coco机器人 HTTP API 插件的监听地址，如果你不需要调用 API，也可以不传入。Access token 和签名密钥也在这里传入，如果没有配置 `access_token` 或 `secret` 项，则不传。

### 事件处理

`on()` 方法用于添加对应上报类型（`Event`）的回调函数，目前有七个上报类型 `JoinChatroom`、`PushLoginUrl`、`ReceiveSysMsg`、`ReceiveVerifyMsg`、`ReceiveQRPayMsg`、`ReceiveHBMsg`、`ReceiveMessage`，一个上报类型可以有多个回调，收到上报时按添加顺序来调用。

回调函数接受一个参数 `context`，即为上报的数据，具体数据内容见 [事件上报](http://www.svnhost.cn/doc/mc/%E5%AE%89%E5%8D%93%E5%BE%AE%E4%BF%A1%E6%9C%BA%E5%99%A8%E4%BA%BA%E6%8F%92%E4%BB%B6%E5%BC%80%E5%8F%91-2.html)。

函数可以不返回值，也可以返回一个对象，会被自动作为 JSON 响应返回给 HTTP API 插件，具体见 [上报请求的响应数据格式](http://www.svnhost.cn/doc/mc/%E5%AE%89%E5%8D%93%E5%BE%AE%E4%BF%A1%E6%9C%BA%E5%99%A8%E4%BA%BA%E6%8F%92%E4%BB%B6%E5%BC%80%E5%8F%91-2.html)。如果同一个上报类型添加了多个回调，只有最后一个有返回值的回调的返回值会被返回给插件。

### API 调用

在设置了 `api_root` 的情况下，直接在 `ccwxhttp` 类的实例上就可以调用 API，第一个参数为要调用的接口（或者称为 action），第二个可选参数为一个对象用于传入参数，例如 `bot('SendMessage', ['123456','hello'])`，这里的 `SendMessage` 即为 发送私聊消息的方法名。  `['123456','hello']` 为要发送的参数 数组类型 以API 描述的参数按顺序写入 。

还对大部分方法做了简单处理，还可以这样写 
`bot.SendMessage('123456', 'hello')`

其它 API 见 [API 描述](http://www.svnhost.cn/doc/mc/%E5%AE%89%E5%8D%93%E5%BE%AE%E4%BF%A1%E6%9C%BA%E5%99%A8%E4%BA%BA%E6%8F%92%E4%BB%B6%E5%BC%80%E5%8F%91-2.html)。

每个 API 调用最后都会由 `axios` 库来发出请求，如果网络无法连接，它可能会抛出一个异常，见 [Handling Errors](https://github.com/axios/axios#handling-errors)。而一旦请求成功，本 SDK 会判断 HTTP 响应状态码，只有当状态码为 200，且 `status` 字段为 `ok` 或 `async` 时，会返回 `data` 字段的内容，否则也抛出一个异常（是一个简单对象）

### 运行实例

使用装饰器定义好处理函数之后，调用 `bot.listen()` 即可运行。这个方法第一个参数为监听端口，第二个参数为监听的 host，来指定服务端需要运行在哪个地址，然后在 HTTP API 插件的配置文件中，在 `post_url` 项中配置此地址（`http://host:port/`）。

## 遇到问题

本 SDK 的代码非常简单，如果发现有问题可以参考下源码，可以自行做一些修复，也欢迎提交 pull request 或 issue。
