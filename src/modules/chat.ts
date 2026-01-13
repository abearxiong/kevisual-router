import { QueryRouter } from "../route.ts";
import { filter } from '@kevisual/js-filter'
type RouterChatOptions = {
  router?: QueryRouter;
}
export class RouterChat {
  router: QueryRouter;
  prompt: string = '';
  constructor(opts?: RouterChatOptions) {
    this.router = opts?.router || new QueryRouter();
  }
  prefix(opts?: { query?: string }) {
    if (this.prompt) {
      return this.prompt;
    }
    let _routes = this.router.routes;
    if (opts?.query) {
      _routes = filter(this.router.routes, opts.query);
    }
    const toolsList = _routes.map((r, index) =>
      `${index + 1}. 工具名称: ${r.id}\n   描述: ${r.description}`
    ).join('\n\n');
    const _prompt = `你是一个 AI 助手，你可以使用以下工具来帮助用户完成任务:

${toolsList}

## 回复规则
1. 如果用户的请求可以使用上述工具完成，请返回 JSON 格式数据
2. 如果没有合适的工具，请直接分析并回答用户问题

## JSON 数据格式
\`\`\`json
{
  "id": "工具的id",
  "payload": {
    // 工具所需的参数（如果需要）
    // 例如: "id": "xxx", "name": "xxx"
  }
}
\`\`\`

注意：
- payload 中包含工具执行所需的所有参数
- 如果工具不需要参数，payload 可以为空对象 {}
- 确保返回的 id 与上述工具列表中的工具名称完全匹配`

    this.prompt = _prompt;
    return _prompt;
  }
  recreate() {
    this.prompt = '';
  }
  getChatPrompt() {
    const prompt = this.prefix();
    return prompt;
  }
}