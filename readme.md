# router

```ts
import { App } from '@kevisual/router';

const app = new App();
app.listen(4002);

app
  .route({path:'demo', key: '02})
  .define(async (ctx) => {
    ctx.body = '02';
  })
  .addTo(app);

app
  .route('demo', '03')
  .define(async (ctx) => {
    ctx.body = '03';
  })
  .addTo(app);
```
## 兼容服务器
```
import { App } from '@kevisual/router';

const app = new App();
app.listen(4002);
import { proxyRoute, initProxy } from '@kevisual/local-proxy/proxy.ts';
initProxy({
  pagesDir: './demo',
  watch: true,
});

app.onServerRequest(proxyRoute);
```