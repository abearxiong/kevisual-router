import { app } from './app.ts'
import { createRouterAgentPluginFn } from '../src/opencode.ts'
import './routes/index.ts'

// 工具列表
export const routerAgentPlugin = createRouterAgentPluginFn({ router: app });