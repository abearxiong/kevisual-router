import { proxyRoute, initProxy } from '@kevisual/local-proxy/proxy.ts';
initProxy({
  pagesDir: './demo',
  watch: true,
});
import { App } from '../app.ts';

const app = new App();
app
  .route({
    path: 'a',
  })
  .define(async (ctx) => {
    ctx.body = '1';
  })
  .addTo(app);

app.listen(2233, () => {
  console.log('Server is running on http://localhost:2233');
});

app.onServerRequest(proxyRoute);
