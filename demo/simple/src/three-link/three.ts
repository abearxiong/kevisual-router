import { Route, App } from '@kevisual/router';
import { readFileSync } from 'fs';
const app = new App({
  serverOptions: {
    cors: {},
    httpType: 'https',
    httpsKey: readFileSync('https-key.pem', 'utf8'),
    httpsCert: readFileSync('https-cert.pem', 'utf-8'),
  },
});

app
  .route({
    path: 'demo',
    key: '01',
  })
  .define(async (ctx) => {
    ctx.token = '01';
    ctx.body = '01';
    ctx.state.t01 = '01';
    console.log('state01', ctx.state);
  })
  .addTo(app);

app
  .route({
    path: 'demo',
    key: '02',
    middleware: [{ path: 'demo', key: '01' } as Route],
  })
  .define(async (ctx) => {
    ctx.body = '02';
    ctx.state.t02 = '02';
    console.log('state02', ctx.state, 't', ctx.token);
  })
  .addTo(app);

app
  .route({
    path: 'demo',
    key: '03',
    middleware: [{ path: 'demo', key: '02' } as Route],
  })
  .define(async (ctx) => {
    ctx.body = '03';
    console.log('state03', ctx.state);
  })
  .addTo(app);

app.call({ path: 'demo', key: '03' }).then((ctx) => {
  console.log('result', ctx.body);
});
