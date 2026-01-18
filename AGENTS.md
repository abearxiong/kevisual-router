# @kevisual/router

## 是什么

`@kevisual/router` 是一个基于自定义的的轻量级路由框架，支持 TypeScript，适用于构建 API 服务。

## 安装

```bash
npm install @kevisual/router
```

## 快速开始

```ts
import { App } from '@kevisual/router';
const app = new App();
app.listen(4002);

app.route({path:'demo', key: '01'})
  .define(async (ctx) => {
    ctx.body = '01';
  })
  .addTo(app);
```