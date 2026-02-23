import { useContextKey } from '@kevisual/context'
import { createSkill, type QueryRouterServer, tool, type Skill } from './route.ts'
import { type App } from './app.ts'
import { PluginInput, type Plugin, Hooks } from "@opencode-ai/plugin"

import { filter } from '@kevisual/js-filter';

export const addCallFn = (app: App) => {
  app.route({
    path: 'call',
    key: '',
    description: '调用',
    middleware: ['auth-admin'],
    metadata: {
      tags: ['opencode'],
      ...createSkill({
        skill: 'call-app',
        title: '调用app应用,非技能模块',
        summary: `调用router的应用(非技能模块)，适用于需要直接调用应用而不是技能的场景
条件1: 参数path(string), key(string), payload(object)
条件2: 当前的应用调用的模式不是技能

`,
        args: {
          path: tool.schema.string().describe('应用路径，例如 cnb'),
          key: tool.schema.string().optional().describe('应用key，例如 list-repos'),
          payload: tool.schema.object({}).optional().describe('调用参数, 为对象, 例如 { "query": "javascript" }'),
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
  router?: App | QueryRouterServer,
  //** 过滤比如，WHERE metadata.tags includes 'opencode' */
  query?: string,
  hooks?: (plugin: PluginInput) => Promise<Hooks>
}) => {
  new Promise(resolve => setTimeout(resolve, 100)) // 等待路由加载
  let router = opts?.router

  if (!router) {
    const app = useContextKey<App>('app')
    router = app
  }
  if (!router) {
    throw new Error('Router 参数缺失')
  }
  if (!router.hasRoute('call', '')) {
    addCallFn(router as App)
  }
  if (router) {
    (router as any).route({ path: 'auth', key: '', id: 'auth', description: '认证' }).define(async (ctx) => { }).addTo(router as App, {
      overwrite: false
    });

    (router as any).route({ path: 'auth-admin', key: '', id: 'auth-admin', description: '认证' }).define(async (ctx) => { }).addTo(router as App, {
      overwrite: false
    })
  }

  const _routes = filter(router.routes, opts?.query || '')
  const routes = _routes.filter(r => {
    const metadata = r.metadata as Skill
    if (metadata && metadata.skill && metadata.summary) {
      return true
    }
    if (metadata && metadata.tags && metadata.tags.includes('opencode')) {
      return !!metadata.skill
    }
    return false
  });
  // opencode run "使用技能查看系统信息"
  const AgentPlugin: Plugin = async (pluginInput) => {
    useContextKey<PluginInput>('plugin-input', () => pluginInput, { isNew: true })
    const hooks = opts?.hooks ? await opts.hooks(pluginInput) : {}
    return {
      ...hooks,
      'tool': {
        ...routes.reduce((acc, route) => {
          const metadata = route.metadata as Skill
          let args = extractArgs(metadata?.args)
          acc[metadata.skill!] = {
            name: metadata.title || metadata.skill,
            description: metadata.summary || '',
            args: args,
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
              console.error('调用出错', res);
              return `Error: ${res?.message || '无法获取结果'}`;
            }
          }
          return acc;
        }, {} as Record<string, any>),
        ...hooks?.tool
      },
      // 'tool.execute.before': async (opts) => {
      //   // console.log('CnbPlugin: tool.execute.before', opts.tool);
      //   // delete toolSkills['cnb-login-verify']
      // },
    }
  }
  return AgentPlugin
}

export const usePluginInput = (): PluginInput => {
  return useContextKey<PluginInput>('plugin-input')
}

/**
 * 如果args是z.object类型，拆分第一个Object的属性，比如z.object({ name: z.string(), age: z.number() })，拆分成{name: z.string(), age: z.number()}
 * 如果args是普通对象，直接返回
 * @param args 
 * @returns
 */
export const extractArgs = (args: any) => {
  if (args && typeof args === 'object' && typeof args.shape === 'object') {
    return args.shape
  }
  return args || {}
}