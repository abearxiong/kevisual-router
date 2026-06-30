# @kevisual/router

轻量级路由框架，支持 TypeScript，适用于构建 API 服务。

## 安装

```bash
npm install @kevisual/router
```

## 快速开始

### 链式 API

```ts
import { App } from '@kevisual/router';
const app = new App();
app.listen(4002);

app
  .route({ path: 'demo', key: '01' })
  .define(async (ctx) => {
    ctx.body = '01';
  })
  .addTo(app);
```

### 装饰器 API（推荐）

```ts
import { Mini, Controller, Route } from '@kevisual/router';

const app = new Mini();

@Controller()
class HelloController {
  @Route({ path: 'hello', description: '打招呼' })
  async greet(ctx: any) {
    ctx.body = 'Hello, world!';
  }
}

app.registerControllers([HelloController]);
```

## 核心概念

- **Route**: 最小路由单元，由 `path` + `key` 唯一标识
- **Context**: 贯穿请求生命周期的上下文对象 (`RouteContext`)
- **Middleware**: 支持按 rid 或 path/key 引用的中间件系统
- **Server**: 内置 HTTP 服务器，统一入口 `/api/router`

## 导出模块

| 入口 | 说明 |
|------|------|
| `@kevisual/router` | 主入口（含 App、Server） |
| `@kevisual/router/browser` | 浏览器端（不含 Node/Bun Server） |
| `@kevisual/router/commander` | CLI 解析工具 |
| `@kevisual/router/simple` | SimpleRouter（轻量 HTTP 路由） |
| `@kevisual/router/ws` | WebSocket 客户端 |
| `@kevisual/router/opencode` | OpenCode AI Plugin    |

## License

MIT
