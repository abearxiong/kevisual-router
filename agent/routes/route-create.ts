import { app, createSkill, tool } from '../app.ts';
import * as docs from '../gen/index.ts'
import * as pkgs from '../../package.json' assert { type: 'json' };
app.route({
  path: 'router-skill',
  key: 'create-route',
  description: '创建路由技能',
  middleware: ['auth'],
  metadata: {
    tags: ['opencode'],
    ...createSkill({
      skill: 'create-router-skill',
      title: '创建路由技能',
      summary: '创建一个新的路由技能，参数包括路径、键、描述、参数等',
      args: {
        question: tool.schema.string().describe('要实现的功能'),
      }
    })
  },
}).define(async (ctx) => {
  const { question } = ctx.query || {};
  if (!question) {
    ctx.throw('参数 question 不能为空');
  }
  let base = ''
  base += `根据用户需要实现的功能生成一个route的代码：${question}\n\n`;
  base += `资料库：\n`
  base += docs.readme + '\n\n';

  ctx.body = {
    body: base
  }
}).addTo(app);

// 调用router应用 path router-skill key version
app.route({
  path: 'router-skill',
  key: 'version',
  description: '获取路由技能版本',
  middleware: ['auth'],
}).define(async (ctx) => {
  ctx.body = {
    content: pkgs.version || 'unknown'
  }
}).addTo(app);