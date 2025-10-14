import { App } from "../app.ts";

const app = new App({
  io: true
});

app
  .route('demo', '03')
  .define(async (ctx) => {
    ctx.body = '03';
    return ctx;
  })
  .addTo(app);
app
  .route('test', 'test')
  .define(async (ctx) => {
    ctx.body = 'test';
    return ctx;
  })
  .addTo(app);
console.log(`http://localhost:4002/api/router?path=demo&key=03`);

app.listen(4002, () => {
  console.log("Server started on http://localhost:4002");
});