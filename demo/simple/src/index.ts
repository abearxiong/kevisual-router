import { QueryRouter, Route, Server } from '@abearxiong/router';

const router = new QueryRouter();

const route01 = new Route('demo', '01');
route01.run = async (ctx) => {
  ctx.body = '01';
  return ctx;
};
router.add(route01);

const server = new Server({
  handle: async (msg) => {
    const res = await router.parse(msg);
    const { code, body, message } = res;
    // console.log('response', res);
    return { code, data: body, message };
  }
});

// server.setHandle(async (msg) => {
//   const res = await router.parse(msg);
//   const { code, body, message } = res;
//   // console.log('response', res);
//   return { code, data: body, message };
// });

server.listen(3000);

const route02 = new Route('demo', '02');
route02.run = async (ctx) => {
  ctx.body = '02';
  return ctx;
};
router.add(route02);

