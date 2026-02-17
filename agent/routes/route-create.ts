import { app, createSkill, tool } from '../app.ts';
import * as docs from '../gen/index.ts'
import * as pkgs from '../../package.json' assert { type: 'json' };
import z from 'zod';
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

// 获取最新router版本号
app.route({
  path: 'router-skill',
  key: 'version',
  description: '获取最新router版本号',
  middleware: ['auth'],
  metadata: {
    tags: ['opencode'],
    ...createSkill({
      skill: 'router-skill-version',
      title: '获取最新router版本号',
      summary: '获取最新router版本号',
      args: {}
    })
  },
}).define(async (ctx) => {
  ctx.body = {
    content: pkgs.version || 'unknown'
  }
}).addTo(app);

// 执行技能test-route-skill,name为abearxiong
app.route({
  path: 'route-skill',
  key: 'test',
  description: '测试路由技能',
  middleware: ['auth'],
  metadata: {
    tags: ['opencode'],
    ...createSkill({
      skill: 'test-route-skill',
      title: '测试路由技能',
      summary: '测试路由技能是否正常工作',
      args: z.object({
        name: z.string().describe('名字'),
      })
    })
  },
}).define(async (ctx) => {
  const name = ctx.query.name || 'unknown';
  ctx.body = {
    content: '测试成功,你好 ' + name
  }
}).addTo(app)