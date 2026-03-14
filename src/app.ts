import { QueryRouterServer, Route, RouteContext, RouteOpts } from './route.ts';
import { ServerNode, ServerNodeOpts } from './server/server.ts';
import { HandleCtx } from './server/server-base.ts';
import { ServerType } from './server/server-type.ts';
import { handleServer } from './server/handle-server.ts';
import { IncomingMessage, ServerResponse } from 'http';
import { isBun } from './utils/is-engine.ts';
import { BunServer } from './server/server-bun.ts';
import { randomId } from './utils/random.ts';

type RouterHandle = (msg: { path: string;[key: string]: any }) => { code: string; data?: any; message?: string;[key: string]: any };
type AppOptions<T = {}> = {
  router?: QueryRouterServer;
  server?: ServerType;
  /** handle msg 关联 */
  routerHandle?: RouterHandle;
  routerContext?: RouteContext<T>;
  serverOptions?: ServerNodeOpts;
  appId?: string;
};

export type AppRouteContext<T> = HandleCtx & RouteContext<T> & { app: App<T> };

/**
 *  封装了 Router 和 Server 的 App 模块，处理http的请求和响应，内置了 Cookie 和 Token 和 res 的处理
 *  U - Route Context的扩展类型
 */
export class App<U = {}> extends QueryRouterServer<AppRouteContext<U>> {
  declare appId: string;
  router: QueryRouterServer;
  server: ServerType;
  declare context: AppRouteContext<U>;
  constructor(opts?: AppOptions<U>) {
    super({ initHandle: false, context: { needSerialize: true, ...opts?.routerContext } as any });
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
    this.router = router;
    this.server = server;
    if (opts?.appId) {
      this.appId = opts.appId;
    } else {
      this.appId = randomId(16, 'rand-');
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
  Route = Route;
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
