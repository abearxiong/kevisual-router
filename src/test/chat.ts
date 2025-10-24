import { App } from '../app.ts'
import { RouterChat } from '@/chat.ts';

const app = new App();

app.prompt(`获取时间的工具`).define(async (ctx) => {
  ctx.body = '123'
}).addTo(app);

app.prompt('获取天气的工具。\n参数是 city 为对应的城市').define(async (ctx) => {
  ctx.body = '晴天'
}).addTo(app);


export const chat = new RouterChat({ router: app.router });

console.log(chat.chat());