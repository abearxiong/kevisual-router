import { QueryRouter, Route, RouteContext, RouteOpts } from './route.ts';
import { Server, ServerOpts, HandleCtx } from './server/server.ts';
import { WsServer } from './server/ws-server.ts';
import { CustomError } from './result/error.ts';

type RouterHandle = (msg: { path: string; [key: string]: any }) => { code: string; data?: any; message?: string; [key: string]: any };
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
export type AppReqRes = HandleCtx;

/**
 *  封装了 Router 和 Server 的 App 模块，处理http的请求和响应，内置了 Cookie 和 Token 和 res 的处理
 */
export class App<T = {}, U = AppReqRes> {
  router: QueryRouter;
  server: Server;
  io: WsServer;
  constructor(opts?: AppOptions<T>) {
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
  route(opts: RouteOpts): Route<U>;
  route(path: string, key?: string): Route<U>;
  route(path: string, opts?: RouteOpts): Route<U>;
  route(path: string, key?: string, opts?: RouteOpts): Route<U>;
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
  async call(message: { path: string; key?: string; payload?: any }, ctx?: RouteContext & { [key: string]: any }) {
    const router = this.router;
    return await router.call(message, ctx);
  }
  async queryRoute(path: string, key?: string, payload?: any, ctx?: RouteContext & { [key: string]: any }) {
    return await this.router.queryRoute({ path, key, payload }, ctx);
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
}

export * from './browser.ts';
