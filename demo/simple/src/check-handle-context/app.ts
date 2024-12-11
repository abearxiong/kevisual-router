import { App } from '@kevisual/router';
import { QueryRouterServer } from '@kevisual/router';
const app = new App();
const queryApp = new QueryRouterServer();

// queryApp
//   .route({
//     path: 'api',
//   })
//   .define(async (ctx) => {
//     ctx.throw(404, 'Not Found');
//     ctx.throw(500, 'Internal Server Error');
//   })
//   .addTo(app);

app
  .route({
    path: 'hello',
  })
  .define(async (ctx) => {
    // console.log('hello', ctx);
    // console.log('hello', ctx.res);
    console.log('hello', ctx.query.cookies);
    // ctx.res?.cookie?.('token', 'abc', {
    //   domain: '*', // 设置为顶级域名，允许跨子域共享
    //   // httpOnly: true,
    //   // secure: true,
    //   // sameSite: 'Lax',
    // });
    ctx.res.cookie('token', 'abc', {
      // domain: '*', // 设置为顶级域名，允许跨子域共享
      // httpOnly: true,
      // secure: true,
      // sameSite: 'Lax',
    });
    ctx.res.cookie('test_cookie', 'abc', {
      maxAge: 0,
      path: '/api/router',
    });
    ctx.res.cookie('test_cookie', 'abc', {
      maxAge: 0,
      path: '/',
    });
    ctx.res.cookie('user', 'abc', {
      maxAge: 0,
    });
    ctx.res.cookie('session', 'abc', {
      maxAge: 0,
    });
    ctx.res.cookie('preferences', 'abc', {
      maxAge: 0,
    });
    // const cookies = [
    //   cookie.serialize('user', 'john_doe', {
    //     httpOnly: true,
    //     maxAge: 60 * 60 * 24 * 7, // 1 week
    //     sameSite: 'lax',
    //   }),
    //   cookie.serialize('session', 'xyz123', {
    //     httpOnly: true,
    //     maxAge: 60 * 60 * 24, // 1 day
    //   }),
    //   cookie.serialize('preferences', JSON.stringify({ theme: 'dark' }), {
    //     httpOnly: false, // Accessible via JavaScript
    //     maxAge: 60 * 60 * 24 * 30, // 1 month
    //   }),
    // ];
    // ctx.res.setHeader('Set-Cookie', cookies);
    ctx.res.end('hello' + Math.random().toString(32).slice(2));

    ctx.end = true;
    return;
    ctx.body = 'world';
  })
  .addTo(app);
app.listen(3100, () => {
  console.log('listening on port http://localhost:3100');
});
