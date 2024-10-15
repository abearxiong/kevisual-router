import { Route, App } from '@abearxiong/router';

const app = new App();
app.listen(4003);
const route01 = new Route('demo', '01');
route01.run = async (ctx) => {
  ctx.body = '01';
  return ctx;
};
app.use(
  'demo',
  async (ctx) => {
    ctx.body = '01';
    return ctx;
  },
  { key: '01' },
);

const route02 = new Route('demo', '02');
route02.run = async (ctx) => {
  ctx.body = '02';
  return ctx;
};
app.addRoute(route02);

console.log(`http://localhost:4003/api/router?path=demo&key=02`);
console.log(`http://localhost:4003/api/router?path=demo&key=01`);
