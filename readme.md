# router

```
import { App } from '@kevisual/router';

const app = new App();
app.listen(4002);

new app.Route('demo', '01')
  .define(async (ctx) => {
    ctx.body = '01';
    return ctx;
  })
  .addTo(app);

app
  .route({path:'demo', key: '02})
  .define(async (ctx) => {
    ctx.body = '02';
    return ctx;
  })
  .addTo(app);

app
  .route('demo', '03')
  .define(async (ctx) => {
    ctx.body = '03';
    return ctx;
  })
  .addTo(app);
```
