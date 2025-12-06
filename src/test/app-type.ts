import { App } from '../app.ts'

const app = new App<{ f: string }>();

app.route({
  path: 't',
  run: async (ctx) => {
    // ctx.r
    ctx.app;
  }
}).define(async (ctx) => {
  ctx.f = 'hello';
}).addTo(app);