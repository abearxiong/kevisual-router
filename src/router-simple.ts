import { pathToRegexp, Key } from 'path-to-regexp';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { parseBody, parseSearch, parseSearchValue } from './server/parse-body.ts';

type Req = IncomingMessage & { params?: Record<string, string> };
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
  all(route: string, ...fns: Array<(req: Req, res: ServerResponse) => Promise<void> | void>) {
    this.use('post', route, ...fns);
    this.use('get', route, ...fns);
    return this;
  }
  /**
   * 解析 req 和 res 请求
   * @param req
   * @param res
   * @returns
   */
  parse(req: Req, res: ServerResponse) {
    const { pathname } = new URL(req.url, 'http://localhost');
    const method = req.method.toLowerCase();
    if (this.exclude.includes(pathname)) {
      return 'is_exclude';
    }
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
}
