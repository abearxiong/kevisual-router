import { Mini } from "../route.ts";

const app = new Mini();

app.route({
  path: 'main',
  rid: 'abc',
  description: '这是一个测试的 main 路由'
}).define(async (ctx) => {
  ctx.body = {
    a: '123'
  }
}).addTo(app)


app.wait()