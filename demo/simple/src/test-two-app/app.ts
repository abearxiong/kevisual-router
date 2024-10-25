import { App } from '@kevisual/router';

const app1 = new App();

app1
  .route({
    path: 'app1',
    key: '01',
  })
  .define(async (ctx) => {
    ctx.body = '01';
    return ctx;
  })
  .addTo(app1);

app1
  .route({
    path: 'app1',
    key: '02',
  })
  .define(async (ctx) => {
    ctx.body = '02';
    return ctx;
  })
  .addTo(app1);

const app2 = new App();

app2
  .route({
    path: 'app2',
    key: '01',
  })
  .define(async (ctx) => {
    ctx.body = 'app2' + '01';
    return ctx;
  })
  .addTo(app2);

app2
  .route({
    path: 'app2',
    key: '02',
  })
  .define(async (ctx) => {
    ctx.body = 'app2' + '02';
    return ctx;
  })
  .addTo(app2);
const app3 = new App();
app3
  .route({
    path: 'app3',
    key: '01',
  })
  .define(async (ctx) => {
    ctx.body = 'app3' + '01';
    return ctx;
  })
  .addTo(app3);

const app = new App();

app.importRoutes(app1.exportRoutes());

app.importRoutes(app2.exportRoutes());

app.importApp(app3);

app.listen(4003, () => {
  console.log(`http://localhost:4003/api/router?path=app1&key=02`);
  console.log(`http://localhost:4003/api/router?path=app1&key=01`);
  console.log(`http://localhost:4003/api/router?path=app2&key=02`);
  console.log(`http://localhost:4003/api/router?path=app2&key=01`);
  console.log(`http://localhost:4003/api/router?path=app3&key=01`);
});
