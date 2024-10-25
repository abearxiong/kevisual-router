import { App } from '@kevisual/router';

const app = new App();

app.listen(4002, () => {
  console.log('Server is running at http://localhost:4002');
});
const callback = (req, res) => {
  if (req.url.startsWith('/api/v')) {
    // 在这里处理 /api/v 的请求
    // res.writeHead(200, { 'Content-Type': 'text/plain' });
    setTimeout(() => {
      res.end('Intercepted /api/v request');
    }, 2000);
  }
};

app.server.on(callback);

new app.Route('demo', '01')
  .define(async (ctx) => {
    ctx.body = '01';
    return ctx;
  })
  .addTo(app);

app
  .route('demo')
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
