import { pathToRegexp, Key } from 'path-to-regexp';
import type { IncomingMessage, ServerResponse, Server } from 'node:http';
import { parseBody, parseSearch, parseSearchValue } from './server/parse-body.ts';
import { ListenOptions } from 'node:net';

type Req = IncomingMessage & { params?: Record<string, string> };
type SimpleObject = {
  [key: string]: any;
};
interface Route {
  method: string;
  regexp: RegExp;
  keys: Key[];
  handlers: Array<(req: Req, res: ServerResponse) => Promise<void> | void>;
}
/**
 * SimpleRouter
 */
export class SimpleRouter {
  routes: Route[] = [];
  exclude: string[] = []; // 排除的请求
  constructor(opts?: { exclude?: string[] }) {
    this.exclude = opts?.exclude || ['/api/router'];
  }
  getBody(req: Req) {
    return parseBody<Record<string, any>>(req);
  }
  getSearch(req: Req) {
    return parseSearch(req);
  }
  parseSearchValue = parseSearchValue;
  use(method: string, route: string, ...fns: Array<(req: Req, res: ServerResponse) => Promise<void> | void>) {
    const handlers = Array.isArray(fns) ? fns.flat() : [];
    const pattern = pathToRegexp(route);
    this.routes.push({ method: method.toLowerCase(), regexp: pattern.regexp, keys: pattern.keys, handlers });
    return this;
  }
  get(route: string, ...fns: Array<(req: Req, res: ServerResponse) => Promise<void> | void>) {
    return this.use('get', route, ...fns);
  }
  post(route: string, ...fns: Array<(req: Req, res: ServerResponse) => Promise<void> | void>) {
    return this.use('post', route, ...fns);
  }
  sse(route: string, ...fns: Array<(req: Req, res: ServerResponse) => Promise<void> | void>) {
    return this.use('sse', route, ...fns);
  }
  all(route: string, ...fns: Array<(req: Req, res: ServerResponse) => Promise<void> | void>) {
    this.use('post', route, ...fns);
    this.use('get', route, ...fns);
    this.use('sse', route, ...fns);
    return this;
  }
  getJson(v: string | number | boolean | SimpleObject) {
    if (typeof v === 'object') {
      return v;
    }
    try {
      return JSON.parse(v as string);
    } catch (e) {
      return {};
    }
  }
  isSse(req: Req) {
    const { headers } = req;
    if (headers['accept'] && headers['accept'].includes('text/event-stream')) {
      return true;
    }
    if (headers['content-type'] && headers['content-type'].includes('text/event-stream')) {
      return true;
    }
    return false;
  }
  /**
   * 解析 req 和 res 请求
   * @param req
   * @param res
   * @returns
   */
  parse(req: Req, res: ServerResponse) {
    const { pathname } = new URL(req.url, 'http://localhost');
    let method = req.method.toLowerCase();
    if (this.exclude.includes(pathname)) {
      return 'is_exclude';
    }
    const isSse = this.isSse(req);
    if (isSse) method = 'sse';
    const route = this.routes.find((route) => {
      const matchResult = route.regexp.exec(pathname);
      if (matchResult && route.method === method) {
        const params: Record<string, string> = {};
        route.keys.forEach((key, i) => {
          params[key.name] = matchResult[i + 1];
        });
        req.params = params;
        return true;
      }
    });

    if (route) {
      const { handlers } = route;
      return handlers.reduce((promiseChain, handler) => promiseChain.then(() => Promise.resolve(handler(req, res))), Promise.resolve());
    }

    return 'not_found';
  }
  /**
   * 创建一个新的 HttpChain 实例
   * @param req
   * @param res
   * @returns
   */
  chain(req?: Req, res?: ServerResponse) {
    const chain = new HttpChain({ req, res, simpleRouter: this });
    return chain;
  }
  static Chain(opts?: HttpChainOpts) {
    return new HttpChain(opts);
  }
}

type HttpChainOpts = {
  req?: Req;
  res?: ServerResponse;
  simpleRouter?: SimpleRouter;
  server?: Server;
};

/**
 * HttpChain 类, 用于链式调用,router.get内部使用
 */

export class HttpChain {
  /**
   * 请求对象, 每一次请求都是不一样的
   */
  req: Req;
  /**
   * 响应对象, 每一次请求响应都是不一样的
   */
  res: ServerResponse;
  simpleRouter: SimpleRouter;
  server: Server;
  hasSetHeader: boolean = false;
  isSseSet: boolean = false;
  constructor(opts?: HttpChainOpts) {
    if (opts?.res) {
      this.res = opts.res;
    }
    if (opts?.req) {
      this.req = opts.req;
    }
    this.simpleRouter = opts?.simpleRouter;
  }
  setReq(req: Req) {
    this.req = req;
    return this;
  }
  setRes(res: ServerResponse) {
    this.res = res;
    return this;
  }
  setRouter(router: SimpleRouter) {
    this.simpleRouter = router;
    return this;
  }
  setServer(server: Server) {
    this.server = server;
    return this;
  }
  /**
   * 兼容 express 的一点功能
   * @param status
   * @returns
   */
  status(status: number) {
    if (!this.res) return this;
    if (this.hasSetHeader) {
      return this;
    }
    this.hasSetHeader = true;
    this.res.writeHead(status);
    return this;
  }
  writeHead(status: number) {
    if (!this.res) return this;
    if (this.hasSetHeader) {
      return this;
    }
    this.hasSetHeader = true;
    this.res.writeHead(status);
    return this;
  }
  json(data: SimpleObject) {
    if (!this.res) return this;
    this.res.end(JSON.stringify(data));
    return this;
  }
  /**
   * 兼容 express 的一点功能
   * @param data
   * @returns
   */
  end(data: SimpleObject | string) {
    if (!this.res) return this;
    if (typeof data === 'object') {
      this.res.end(JSON.stringify(data));
    } else if (typeof data === 'string') {
      this.res.end(data);
    } else {
      this.res.end('nothing');
    }
    return this;
  }

  listen(opts: ListenOptions, callback?: () => void) {
    this.server.listen(opts, callback);
    return this;
  }
  /**
   * 外部 parse 方法
   * @returns 
   */
  parse(opts?: { listenOptions?: ListenOptions, listenCallBack?: () => void }) {
    const { listenOptions, listenCallBack } = opts || {};

    if (!this.server || !this.simpleRouter) {
      throw new Error('Server and SimpleRouter must be set before calling parse');
    }
    const that = this;
    const listener = (req: Req, res: ServerResponse) => {
      try {
        that.simpleRouter.parse(req, res);
      } catch (error) {
        console.error('Error parsing request:', error);
        if (!res.headersSent) {
          res.writeHead(500);
          res.end(JSON.stringify({ code: 500, message: 'Internal Server Error' }));
        }
      }
    };
    if (listenOptions) {
      this.server.listen(listenOptions, listenCallBack);
    }
    this.server.on('request', listener);
    return () => {
      that.server.removeListener('request', listener);
    };
  }
  getString(value: string | SimpleObject) {
    if (typeof value === 'string') {
      return value;
    }
    return JSON.stringify(value);
  }
  sse(value: string | SimpleObject) {
    const res = this.res;
    const req = this.req;
    if (!res || !req) return;
    const data = this.getString(value);
    if (this.isSseSet) {
      res.write(`data: ${data}\n\n`);
      return this;
    }
    const headersMap = new Map<string, string>([
      ['Content-Type', 'text/event-stream'],
      ['Cache-Control', 'no-cache'],
      ['Connection', 'keep-alive'],
    ]);
    this.isSseSet = true;
    let intervalId: NodeJS.Timeout;
    if (!this.hasSetHeader) {
      this.hasSetHeader = true;
      res.setHeaders(headersMap);
      // 每隔 2 秒发送一个空行，保持连接
      setInterval(() => {
        res.write('\n'); // 发送一个空行，保持连接
      }, 3000);
      // 客户端断开连接时清理
      req.on('close', () => {
        clearInterval(intervalId);
        res.end();
      });
    }
    this.res.write(`data: ${data}\n\n`);
    return this;
  }
  close() {
    if (this.req?.destroy) {
      this.req.destroy();
    }
    return this;
  }
}
