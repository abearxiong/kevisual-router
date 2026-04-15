import { Mini } from "../route.ts";
import { parse, } from '../commander.ts'
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

app.route({
  path: 'good',
  description: '这是一个测试的 good 路由'
}).define(async (ctx) => {
  ctx.body = { content: 'good' }
  console.log('good')
}).addTo(app)
// app.wait()

await parse({ app })