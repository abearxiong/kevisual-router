# 最基本的用法

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
  
```