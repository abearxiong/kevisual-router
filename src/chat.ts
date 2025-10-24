import { QueryRouter } from "./route.ts";

type RouterChatOptions = {
  router?: QueryRouter;
}
export class RouterChat {
  router: QueryRouter;
  prompt: string = '';
  constructor(opts?: RouterChatOptions) {
    this.router = opts?.router || new QueryRouter();
  }
  prefix(wrapperFn?: (routes: any[]) => string) {
    if (this.prompt) {
      return this.prompt;
    }
    let _prompt = `你是一个调用函数工具的助手，当用户询问时，如果拥有工具，请返回 JSON 数据，数据的值的内容是 id 和 payload 。如果有参数，请放到 payload 当中。

下面是你可以使用的工具列表：

`;
    if (!wrapperFn) {
      _prompt += this.router.routes.map(r => `工具名称: ${r.id}\n描述: ${r.description}\n`).join('\n');
    } else {
      _prompt += wrapperFn(this.router.exportRoutes());
    }
    _prompt += `当你需要使用工具时，请严格按照以下格式返回：
{
  "id": "工具名称",
  "payload": {
    // 参数列表
  }
}
如果你不需要使用工具，直接返回用户想要的内容即可，不要返回任何多余的信息。`;
    return _prompt;
  }
  chat() {
    const prompt = this.prefix();
    return prompt;
  }
}