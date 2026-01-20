import { useContextKey } from '@kevisual/context'
import { createSkill, type QueryRouterServer, tool, type QueryRouter, type Skill } from './route.ts'
import { type App } from './app.ts'
import { type Plugin } from "@opencode-ai/plugin"

import { filter } from '@kevisual/js-filter';
export const addCallFn = (app: QueryRouterServer) => {
  app.route({
    path: 'call',
    key: '',
    description: '调用',
    middleware: ['auth'],
    metadata: {
      tags: ['opencode'],
      ...createSkill({
        skill: 'call-app',
        title: '调用app应用',
        summary: '调用router的应用, 参数path, key, payload',
        args: {
          path: tool.schema.string().describe('应用路径，例如 cnb'),
          key: tool.schema.string().optional().describe('应用key，例如 list-repos'),
          payload: tool.schema.object({}).optional().describe('调用参数'),
        }
      })
    },
  }).define(async (ctx) => {
    const { path, key = '' } = ctx.query;
    if (!path) {
      ctx.throw('路径path不能为空');
    }
    const res = await ctx.run({ path, key, payload: ctx.query.payload || {} }, {
      ...ctx
    });
    ctx.forward(res);
  }).addTo(app)
}
export const createRouterAgentPluginFn = (opts?: {
  router?: QueryRouter,
  //** 过滤比如，WHERE metadata.tags includes 'opencode' */
  query?: string
}) => {
  let router = opts?.router
  if (!router) {
    const app = useContextKey<App>('app')
    router = app.router
  }
  if (!router) {
    throw new Error('Router 参数缺失')
  }
  if (!router.hasRoute('call', '')) {
    addCallFn(router as QueryRouterServer)
  }
  const _routes = filter(router.routes, opts?.query || '')
  const routes = _routes.filter(r => {
    const metadata = r.metadata as Skill
    if (metadata && metadata.tags && metadata.tags.includes('opencode')) {
      return !!metadata.skill
    }
    return false
  })
  // opencode run "查看系统信息"
  const AgentPlugin: Plugin = async ({ project, client, $, directory, worktree }) => {
    return {
      'tool': {
        ...routes.reduce((acc, route) => {
          const metadata = route.metadata as Skill
          acc[metadata.skill!] = {
            name: metadata.title || metadata.skill,
            description: metadata.summary || '',
            args: metadata.args || {},
            async execute(args: Record<string, any>) {
              const res = await router.run({
                path: route.path,
                key: route.key,
                payload: args
              },
                { appId: router.appId! });
              if (res.code === 200) {
                if (res.data?.content) {
                  return res.data.content;
                }
                if (res.data?.final) {
                  return '调用程序成功';
                }
                const str = JSON.stringify(res.data || res, null, 2);
                if (str.length > 10000) {
                  return str.slice(0, 10000) + '... (truncated)';
                }
                return str;
              }
              return `Error: ${res?.message || '无法获取结果'}`;
            }
          }
          return acc;
        }, {} as Record<string, any>)
      },
      'tool.execute.before': async (opts) => {
        // console.log('CnbPlugin: tool.execute.before', opts.tool);
        // delete toolSkills['cnb-login-verify']
      }
    }
  }
  return AgentPlugin
}
