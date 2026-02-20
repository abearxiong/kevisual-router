import { app } from '../app.ts'
import './route-create.ts'

app.route({
  path: 'auth',
  key: '',
  id: 'auth',
  description: '身份验证路由',
}).define(async (ctx) => {
  //
}).addTo(app, { overwrite: false });

app.route({
  path: 'auth-admin',
  key: '',
  id: 'auth-admin',
  description: '管理员身份验证路由',
}).define(async (ctx) => {
  //
}).addTo(app, { overwrite: false });