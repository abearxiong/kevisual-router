import { QueryRouterServer } from '@kevisual/router';

const router = new QueryRouterServer();

router
  .route({
    path: 'hello',
    key: 'world',
  })
  .define(async (ctx) => {
    ctx.body = 'Hello, world!';
  })
  .addTo(router);

router
  .run({
    path: 'hello',
    key: 'world',
  })
  .then((res) => {
    console.log(res);
  });
