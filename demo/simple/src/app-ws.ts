import { Route, App, tool } from '@kevisual/router/src/app.ts';
import util from 'node:util';
import z from 'zod';
const showMore = (obj) => util.inspect(obj, { showHidden: false, depth: null, colors: true });
const app = new App({ serverOptions: { io: true } });
app.listen(4002);
const route01 = new Route('demo', '01');
route01.run = async (ctx) => {
  ctx.body = '01';
  return ctx;
};

const route02 = new Route('demo', '02');
route02.run = async (ctx) => {
  ctx.body = '02';
  return ctx;
};
app.addRoute(route02);

console.log(`http://localhost:4002/api/router?path=demo&key=02`);
console.log(`http://localhost:4002/api/router?path=demo&key=01`);

app.route({
  path: 'demo',
  key: '03',
  metadata: {
    info: 'This is route 03',
    args: {
      test: tool.schema.string().describe('defaultTest'),
    }
  },
}).define(async (ctx) => {
  ctx.body = '03';
  return ctx;
}).addTo(app);
// app.server.on({
//   id: 'abc',
//   path: '/ws',
//   io: true,
//   func: async (req,res) => {
//     console.log('Custom middleware for /ws');
//     // console.log('Data received:', data);
//     // end({ message: 'Hello from /ws middleware' });
//   }
// })
await app.createRouteList()
const res = await app.run({ path: 'router', key: 'list' })

console.log('Route List:', showMore(res.data));

const list = res.data.list;

for (const item of list) {
  const args = item.metadata?.args || {}
  const keys = Object.keys(args)
  if (keys.length > 0) {
    // console.log(`Route ${item.key} has args:`, showMore(args));
    // for (const k of keys) {
    //   const argSchema = args[k];
    //   const v = z.fromJSONSchema(argSchema)
    //   console.log(`  Arg ${k}:`, v.description, v.toJSONSchema());
    // }
    // const v = z.fromJSONSchema(args) as z.ZodObject<any>;
    // if (v instanceof z.ZodObject) {
    //   const testZod = v.shape['test'];
    //   console.log('testZod:', testZod.description);
    // }
    // console.log(`Route ${item.key} args schema:`, v.description, v.toJSONSchema());
    // // console.log('v.', v.)
    // const test = v.parse({ test: 'hello' })
    // console.log('Parsed args:', test);
  }
}