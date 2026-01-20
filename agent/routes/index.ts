import { app } from '../app.ts'
import './route-create.ts'

if (!app.hasRoute('auth', '')) {
  app.route({
    path: 'auth',
    key: '',
    id: 'auth',
    description: '身份验证路由',
  }).define(async (ctx) => {
    //
  }).addTo(app);
}

