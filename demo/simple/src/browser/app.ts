import { CustomError, QueryRouterServer } from '@kevisual/router/browser';

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
  .route({
    path: 'hello',
    key: 'world2',
  })
  .define(async (ctx) => {
    ctx.body = 'Hello, world!';
    // throw new CustomError('error');
    throw new CustomError(5000, 'error');
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

router
  .run({
    path: 'hello',
    key: 'world2',
  })
  .then((res) => {
    console.log(res);
  });
