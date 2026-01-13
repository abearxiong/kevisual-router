import { Route, App } from '@kevisual/router';

const app = new App({ appId: 'abc' });
app.listen(4003);
const route01 = new Route('demo', '00');
route01.run = async (ctx) => {
  ctx.body = '00';
  console.log('appId', ctx.app.appId, ctx);
  return ctx;
};
app.addRoute(route01);

// app.use(
//   'demo',
//   async (ctx) => {
//     ctx.body = '01';
//     return ctx;
//   },
//   { key: '01' },
// );

const route02 = new Route('demo', '02');
route02.run = async (ctx) => {
  ctx.body = '02';
  return ctx;
};
app.addRoute(route02);

console.log(`http://localhost:4003/api/router?path=demo&key=02`);
console.log(`http://localhost:4003/api/router?path=demo&key=01`);
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
await wait(1000);
const a = await app.run({
  path: 'demo',
  key: '00',
})
console.log('a', a);