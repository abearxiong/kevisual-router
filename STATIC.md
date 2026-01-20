## 兼容服务器静态资源代理

```ts
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