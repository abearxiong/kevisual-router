# router

一个轻量级的路由框架，支持链式调用、中间件、嵌套路由等功能。

## 快速开始

```ts
import { App } from '@kevisual/router';

const app = new App();
app.listen(4002);

app
  .route({ path: 'demo', key: '02' })
  .define(async (ctx) => {
    ctx.body = '02';
  })
  .addTo(app);

app
  .route({ path: 'demo', key: '03' })
  .define(async (ctx) => {
    ctx.body = '03';
  })
  .addTo(app);
```
## 浏览器模块使用 router

```ts
import { App } from '@kevisual/router/browser';
```

## 核心概念

### RouteContext 属性说明

在 route handler 中，你可以通过 `ctx` 访问以下属性：

| 属性            | 类型                         | 说明                         |
| --------------- | ---------------------------- | ---------------------------- |
| `query`         | `object`                     | 请求参数，会自动合并 payload |
| `body`          | `number \| string \| Object` | 响应内容                     |
| `code`          | `number`                     | 响应状态码，默认为 200       |
| `message`       | `string`                     | 响应消息                     |
| `state`         | `any`                        | 状态数据，可在路由间传递     |
| `appId`         | `string`                     | 应用标识                     |
| `currentId`     | `string`                     | 当前路由ID                   |
| `currentPath`   | `string`                     | 当前路由路径                 |
| `currentKey`    | `string`                     | 当前路由 key                 |
| `currentRoute`  | `Route`                      | 当前 Route 实例              |
| `progress`      | `[string, string][]`         | 路由执行路径记录             |
| `nextQuery`     | `object`                     | 传递给下一个路由的参数       |
| `end`           | `boolean`                    | 是否提前结束路由执行         |
| `app`           | `QueryRouter`                | 路由实例引用                 |
| `error`         | `any`                        | 错误信息                     |
| `index`         | `number`                     | 当前路由执行深度             |
| `needSerialize` | `boolean`                    | 是否需要序列化响应数据       |

### 上下文方法

| 方法                                | 参数                                      | 说明                                         |
| ----------------------------------- | ----------------------------------------- | -------------------------------------------- |
| `ctx.run(msg, ctx?)`                | `{ path, key?, payload?, ... } \| { rid }`          | 调用其他路由，返回 `{ code, data, message }` |
| `ctx.forward(res)`                  | `{ code, data?, message? }`               | 设置响应结果                                 |
| `ctx.throw(code?, message?, tips?)` | -                                         | 抛出自定义错误                               |

## 完整示例

```ts
import { App } from '@kevisual/router';
import { z } from 'zod';
const app = new App();
app.listen(4002);

// 基本路由
app
  .route({ path: 'user', key: 'info', rid: 'user-info' })
  .define(async (ctx) => {
    // ctx.query 包含请求参数
    const { id } = ctx.query;
    // 使用 state 在路由间传递数据
    ctx.state.orderId = '12345';
    ctx.body = { id, name: '张三' };
    ctx.code = 200;
  })
  .addTo(app);

app
  .route({ path: 'order', key: 'pay', middleware: ['user-info'] })
  .define(async (ctx) => {
    // 可以获取前一个路由设置的 state
    const { orderId } = ctx.state;
    ctx.body = { orderId, status: 'paid' };
  })
  .addTo(app);

// 调用其他路由
app
  .route({ path: 'dashboard', key: 'stats' })
  .define(async (ctx) => {
    // 调用 user/info 路由
    const userRes = await ctx.run({ path: 'user', key: 'info', payload: { id: 1 } });
    // 调用 product/list 路由
    const productRes = await ctx.run({ path: 'product', key: 'list' });

    ctx.body = {
      user: userRes.data,
      products: productRes.data,
    };
  })
  .addTo(app);

// 使用 throw 抛出错误
app
  .route({ path: 'admin', key: 'delete' })
  .define(async (ctx) => {
    const { id } = ctx.query;
    if (!id) {
      ctx.throw(400, '缺少参数：id is required');
    }
    ctx.body = { success: true };
  })
  .addTo(app);
```

## 中间件

```ts
import { App, Route } from '@kevisual/router';

const app = new App();

// 定义中间件
app
  .route({
    rid: 'auth',
    description: '权限校验中间件',
  })
  .define(async (ctx) => {
    const token = ctx.query.token;
    if (!token) {
      ctx.throw(401, '未登录', '需要 token');
    }
    // 验证通过，设置用户信息到 state
    ctx.state.tokenUser = { id: 1, name: '用户A' };
  })
  .addTo(app);

// 使用中间件（通过 rid 引用）
app
  .route({ path: 'admin', key: 'panel', middleware: ['auth'] })
  .define(async (ctx) => {
    // 可以访问中间件设置的 state
    const { tokenUser } = ctx.state;
    ctx.body = { tokenUser };
  })
  .addTo(app);
```

## 一个丰富的router示例

```ts
import { App } from '@kevisual/router';
const app = new App();

app
  .router({
    path: 'dog',
    key: 'info',
    description: '获取小狗的信息',
    metadata: {
      // args: 定义请求参数的 zod schema，用于参数校验和类型推断
      args: {
        name: z.string().describe('小狗的姓名'),
        age: z.number().describe('小狗的年龄'),
      },
      // returns: 定义响应数据的 zod schema，用于返回结果类型推断
      returns: {
        content: z.string().describe('小狗的信息描述'),
      }
    },
  })
  .define(async (ctx) => {
    const { name, age } = ctx.query;
    ctx.body = {
      content: `这是一只${age}岁的小狗，名字是${name}`,
    };
  })
  .addTo(app);
```

### metadata.args 参数说明

`args` 是一个 zod schema 对象，用于定义路由的请求参数结构。每个字段的 key 对应请求时传入的参数名，value 为 zod 的类型定义。

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `name` | `z.string()` | 是 | 小狗的姓名，字符串类型 |
| `age` | `z.number()` | 是 | 小狗的年龄，数字类型 |

**调用示例：**
```ts
// 调用 dog/info 路由
const res = await app.run({
  path: 'dog',
  key: 'info',
  payload: { name: '旺财', age: 3 }
});
// res.data.content => "这是一只3岁的小狗，名字是旺财"
```

### metadata.returns 返回值说明

`returns` 是一个 zod schema 对象，用于定义路由响应的数据结构。主要用于：
1. 类型安全：配合 `runAction` 方法进行返回值的类型推断
2. 文档化：自动生成 API 文档

| 返回字段 | 类型 | 说明 |
|----------|------|------|
| `content` | `z.string()` | 小狗的信息描述，字符串类型 |

**返回结构：**
```ts
{
  code: 200,                    // HTTP 状态码
  data: {                      // 返回的数据，类型由 returns schema 推断
    content: "这是一只3岁的小狗，名字是旺财"
  },
  message: "success"            // 响应消息
}
```

### 配合 runAction 使用

当你使用 `runAction` 方法调用路由时，`args` 和 `returns` 会参与类型推断：

```ts
import { App } from '@kevisual/router';
import { z } from 'zod';

const app = new App();

// 定义 API 结构
const dogAPI = {
  path: 'dog',
  key: 'info',
  metadata: {
    args: {
      name: z.string(),
      age: z.number(),
    },
    returns: {
      content: z.string(),
    }
  }
} as const;

// runAction 会根据 metadata.args 推断 payload 类型
// 根据 metadata.returns 推断返回数据的类型
const res = await app.runAction(dogAPI, { name: '旺财', age: 3 });
// res.data.content 会被正确推断为 string 类型
```

## 注意事项

1. **path 和 key 的组合是路由的唯一标识**，同一个 path+key 只能添加一个路由，后添加的会覆盖之前的。

2. `ctx.run` 返回 `{ code, data, message }` 格式，data 即 body

3. **ctx.throw 会自动结束执行**，抛出自定义错误。

4. **payload 会自动合并到 query**，调用 `ctx.run({ path, key, payload })` 时，payload 会合并到 query。