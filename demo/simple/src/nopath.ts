import { Route, App } from '@kevisual/router/src/index.ts';


const app = new App();

app.route({
  description: 'sdf'
}).define(async (ctx) => {
  ctx.body = 'this is no path fns';
  return ctx;
}).addTo(app);


let id = ''
console.log('routes', app.router.routes.map(item => {
  id = item.id;
  return {
    path: item.path,
    key: item.key,
    id: item.id,
    description: item.description
  }
}))

app.call({id: id}).then(res => {
  console.log('id', id);
  console.log('res', res);
})