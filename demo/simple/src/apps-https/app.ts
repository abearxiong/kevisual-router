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
app.listen(4003, '0.0.0.0', () => {
  console.log(`http://localhost:4003/api/router?path=demo&key=02`);
  console.log(`http://localhost:4003/api/router?path=demo&key=01`);
  console.log(`https://192.168.31.220:4003/api/router?path=demo&key=01`);
});
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
