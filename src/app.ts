import { QueryRouter, Route, RouteContext, RouteOpts } from './route.ts';
import { ServerNode, ServerNodeOpts } from './server/server.ts';
import { HandleCtx } from './server/server-base.ts';
import { ServerType } from './server/server-type.ts';
import { handleServer } from './server/handle-server.ts';
import { IncomingMessage, ServerResponse } from 'http';
import { isBun } from './utils/is-engine.ts';
import { BunServer } from './server/server-bun.ts';
import { nanoid } from 'nanoid';

type RouterHandle = (msg: { path: string;[key: string]: any }) => { code: string; data?: any; message?: string;[key: string]: any };
type AppOptions<T = {}> = {
  router?: QueryRouter;
  server?: ServerType;
  /** handle msg 关联 */
  routerHandle?: RouterHandle;
  routerContext?: RouteContext<T>;
  serverOptions?: ServerNodeOpts;
  appId?: string;
};

export type AppRouteContext<T = {}> = HandleCtx & RouteContext<T> & { app: App<T> };

/**
 *  封装了 Router 和 Server 的 App 模块，处理http的请求和响应，内置了 Cookie 和 Token 和 res 的处理
 *  U - Route Context的扩展类型
 */
export class App<U = {}> extends QueryRouter {
  declare appId: string;
  router: QueryRouter;
  server: ServerType;
  constructor(opts?: AppOptions<U>) {
    super();
    const router = this;
    let server = opts?.server;
    if (!server) {
      const serverOptions = opts?.serverOptions || {};
      if (!isBun) {
        server = new ServerNode(serverOptions)
      } else {
        server = new BunServer(serverOptions)
      }
    }
    server.setHandle(router.getHandle(router, opts?.routerHandle, opts?.routerContext));
    router.setContext({ needSerialize: true, ...opts?.routerContext });
    this.router = router;
    this.server = server;
    if (opts?.appId) {
      this.appId = opts.appId;
    } else {
      this.appId = nanoid(16);
    }
    router.appId = this.appId;
  }
  listen(port: number, hostname?: string, backlog?: number, listeningListener?: () => void): void;
  listen(port: number, hostname?: string, listeningListener?: () => void): void;
  listen(port: number, backlog?: number, listeningListener?: () => void): void;
  listen(port: number, listeningListener?: () => void): void;
  listen(path: string, backlog?: number, listeningListener?: () => void): void;
  listen(path: string, listeningListener?: () => void): void;
  listen(handle: any, backlog?: number, listeningListener?: () => void): void;
  listen(handle: any, listeningListener?: () => void): void;
  listen(...args: any[]) {
    // @ts-ignore
    this.server.listen(...args);
  }
  addRoute(route: Route) {
    super.add(route);
  }

  Route = Route;
  route(opts: RouteOpts<AppRouteContext<U>>): Route<AppRouteContext<U>>;
  route(path: string, key?: string): Route<AppRouteContext<U>>;
  route(path: string, opts?: RouteOpts<AppRouteContext<U>>): Route<AppRouteContext<U>>;
  route(path: string, key?: string, opts?: RouteOpts<AppRouteContext<U>>): Route<AppRouteContext<U>>;
  route(...args: any[]) {
    const [path, key, opts] = args;
    if (typeof path === 'object') {
      return new Route(path.path, path.key, path);
    }
    if (typeof path === 'string') {
      if (opts) {
        return new Route(path, key, opts);
      }
      if (key && typeof key === 'object') {
        return new Route(path, key?.key || '', key);
      }
      return new Route(path, key);
    }
    return new Route(path, key, opts);
  }
  prompt(description: string): Route<AppRouteContext<U>>
  prompt(description: Function): Route<AppRouteContext<U>>
  prompt(...args: any[]) {
    const [desc] = args;
    let description = ''
    if (typeof desc === 'string') {
      description = desc;
    } else if (typeof desc === 'function') {
      description = desc() || ''; // 如果是Promise，需要addTo App之前就要获取应有的函数了。
    }
    return new Route('', '', { description });
  }

  async call(message: { id?: string, path?: string; key?: string; payload?: any }, ctx?: AppRouteContext<U> & { [key: string]: any }) {
    return await super.call(message, ctx);
  }
  async run(msg: { id?: string, path?: string; key?: string; payload?: any }, ctx?: Partial<AppRouteContext<U>> & { [key: string]: any }) {
    return await super.run(msg, ctx);
  }
  static handleRequest(req: IncomingMessage, res: ServerResponse) {
    return handleServer(req, res);
  }
  onServerRequest(fn: (req: IncomingMessage, res: ServerResponse) => void) {
    if (!this.server) {
      throw new Error('Server is not initialized');
    }
    this.server.on({
      id: 'app-request-listener',
      func: fn as any,
    });
  }
}

export * from './browser.ts';
