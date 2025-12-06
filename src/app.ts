import { QueryRouter, Route, RouteContext, RouteOpts } from './route.ts';
import { Server, ServerOpts, HandleCtx } from './server/server.ts';
import { WsServer } from './server/ws-server.ts';
import { CustomError } from './result/error.ts';
import { handleServer } from './server/handle-server.ts';
import { IncomingMessage, ServerResponse } from 'http';

type RouterHandle = (msg: { path: string;[key: string]: any }) => { code: string; data?: any; message?: string;[key: string]: any };
type AppOptions<T = {}> = {
  router?: QueryRouter;
  server?: Server;
  /** handle msg 关联 */
  routerHandle?: RouterHandle;
  routerContext?: RouteContext<T>;
  serverOptions?: ServerOpts;
  io?: boolean;
  ioOpts?: { routerHandle?: RouterHandle; routerContext?: RouteContext<T>; path?: string };
};

export type AppRouteContext<T = {}> = HandleCtx & RouteContext<T> & { app: App<T> };

/**
 *  封装了 Router 和 Server 的 App 模块，处理http的请求和响应，内置了 Cookie 和 Token 和 res 的处理
 *  U - Route Context的扩展类型
 */
export class App<U = {}> {
  router: QueryRouter;
  server: Server;
  io: WsServer;
  constructor(opts?: AppOptions<U>) {
    const router = opts?.router || new QueryRouter();
    const server = opts?.server || new Server(opts?.serverOptions || {});
    server.setHandle(router.getHandle(router, opts?.routerHandle, opts?.routerContext));
    router.setContext({ needSerialize: true, ...opts?.routerContext });
    this.router = router;
    this.server = server;
    if (opts?.io) {
      this.io = new WsServer(server, opts?.ioOpts);
    }
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
    if (this.io) {
      this.io.listen();
    }
  }
  use(path: string, fn: (ctx: any) => any, opts?: RouteOpts) {
    const route = new Route(path, '', opts);
    route.run = fn;
    this.router.add(route);
  }
  addRoute(route: Route) {
    this.router.add(route);
  }
  add = this.addRoute;

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
    const router = this.router;
    return await router.call(message, ctx);
  }
  /**
   * @deprecated
   */
  async queryRoute(path: string, key?: string, payload?: any, ctx?: AppRouteContext<U> & { [key: string]: any }) {
    return await this.router.queryRoute({ path, key, payload }, ctx);
  }
  async run(path: string, key?: string, payload?: any, ctx?: AppRouteContext<U> & { [key: string]: any }) {
    return await this.router.run({ path, key, payload }, ctx);
  }
  exportRoutes() {
    return this.router.exportRoutes();
  }
  importRoutes(routes: any[]) {
    this.router.importRoutes(routes);
  }
  importApp(app: App) {
    this.importRoutes(app.exportRoutes());
  }
  throw(code?: number | string, message?: string, tips?: string): void;
  throw(...args: any[]) {
    throw new CustomError(...args);
  }
  static handleRequest(req: IncomingMessage, res: ServerResponse) {
    return handleServer(req, res);
  }
  onServerRequest(fn: (req: IncomingMessage, res: ServerResponse) => void) {
    if (!this.server) {
      throw new Error('Server is not initialized');
    }
    this.server.on(fn);
  }
}

export * from './browser.ts';
