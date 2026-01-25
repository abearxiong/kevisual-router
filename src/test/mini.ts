import { Mini } from "../route.ts";

const app = new Mini();

app.route({
  path: 'main'
}).define(async (ctx) => {
  ctx.body = {
    a: '123'
  }
}).addTo(app)


app.wait()