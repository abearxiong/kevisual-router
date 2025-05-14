import { App } from '@/app.ts';
import { QueryUtil } from '@/router-define.ts';
const v = QueryUtil.create({
  a: {
    path: 'a',
    key: 'b',
  },
});
const app = new App();
app.route(v.get('a'));

v.chain('a').define<{ f: () => {} }>(async (ctx) => {
  // ctx.f = 'sdf';
});
