import { nanoid } from 'nanoid';
import { CustomError } from './result/error.ts';
import { pick } from './utils/pick.ts';
import { listenProcess } from './utils/listen-process.ts';

export type RouterContextT = { code?: number;[key: string]: any };
export type RouteContext<T = { code?: number }, S = any> = {
  // run first
  query?: { [key: string]: any };
  // response body
  /** return body */
  body?: number | string | Object;
  forward?: (response: { code: number, data?: any, message?: any }) => void;
  /** return code */
  code?: number;
  /** return msg */
  message?: string;
  // 传递状态
  state?: S;
  // transfer data
  /**
   * 当前路径
   */
  currentPath?: string;
  /**
   * 当前key
   */
  currentKey?: string;
  /**
   * 当前route
   */
  currentRoute?: Route;
  /**
   * 进度
   */
  progress?: [string, string][];
  // onlyForNextRoute will be clear after next route
  nextQuery?: { [key: string]: any };
  // end
  end?: boolean;
  app?: QueryRouter;
  error?: any;
  /** 请求 route的返回结果，不解析body为data */
  call?: (
    message: { path: string; key?: string; payload?: any;[key: string]: any } | { id: string; apyload?: any;[key: string]: any },
    ctx?: RouteContext & { [key: string]: any },
  ) => Promise<any>;
  /** 请求 route的返回结果，解析了body为data，就类同于 query.post获取的数据*/
  run?: (message: { path: string; key?: string; payload?: any }, ctx?: RouteContext & { [key: string]: any }) => Promise<any>;
  index?: number;
  throw?: (code?: number | string, message?: string, tips?: string) => void;
  /** 是否需要序列化, 使用JSON.stringify和JSON.parse */
  needSerialize?: boolean;
} & T;
export type SimpleObject = Record<string, any>;
export type Run<T extends SimpleObject = {}> = (ctx: RouteContext<T>) => Promise<typeof ctx | null | void>;

export type NextRoute = Pick<Route, 'id' | 'path' | 'key'>;
export type RouteMiddleware =
  | {
    path: string;
    key?: string;
    id?: string;
  }
  | string;
export type RouteOpts<U = {}, T = SimpleObject> = {
  path?: string;
  key?: string;
  id?: string;
  run?: Run<U>;
  nextRoute?: NextRoute; // route to run after this route
  description?: string;
  metadata?: T;
  middleware?: RouteMiddleware[]; // middleware
  type?: 'route' | 'middleware';
  /**
   * $#$ will be used to split path and key
   */
  idUsePath?: boolean;
  /**
   * id 合并的分隔符，默认为 $#$
   */
  delimiter?: string;
  isDebug?: boolean;
};
export type DefineRouteOpts = Omit<RouteOpts, 'idUsePath' | 'nextRoute'>;
const pickValue = ['path', 'key', 'id', 'description', 'type', 'middleware', 'metadata'] as const;
export type RouteInfo = Pick<Route, (typeof pickValue)[number]>;
export class Route<U = { [key: string]: any }, T extends SimpleObject = SimpleObject> {
  /**
   * 一级路径
   */
  path?: string;
  /**
   * 二级路径
   */
  key?: string;
  id?: string;
  run?: Run;
  nextRoute?: NextRoute; // route to run after this route
  description?: string;
  metadata?: T;
  middleware?: RouteMiddleware[]; // middleware
  type? = 'route';
  data?: any;
  /**
   * 是否开启debug，开启后会打印错误信息
   */
  isDebug?: boolean;
  constructor(path: string = '', key: string = '', opts?: RouteOpts) {
    if (!path) {
      path = nanoid(8)
    }
    path = path.trim();
    key = key.trim();
    this.path = path;
    this.key = key;
    if (opts) {
      this.id = opts.id || nanoid();
      if (!opts.id && opts.idUsePath) {
        const delimiter = opts.delimiter ?? '$#$';
        this.id = path + delimiter + key;
      }
      this.run = opts.run;
      this.nextRoute = opts.nextRoute;
      this.description = opts.description;
      this.metadata = opts.metadata as T;
      this.type = opts.type || 'route';
      this.middleware = opts.middleware || [];
      this.key = opts.key || key;
      this.path = opts.path || path;
    } else {
      this.middleware = [];
      this.id = nanoid();
    }
    this.isDebug = opts?.isDebug ?? false;
  }

  prompt(description: string): this;
  prompt(description: Function): this;
  prompt(...args: any[]) {
    const [description] = args;
    if (typeof description === 'string') {
      this.description = description;
    } else if (typeof description === 'function') {
      this.description = description() || ''; // 如果是Promise，需要addTo App之前就要获取应有的函数了。
    }
    return this;
  }
  define<T extends { [key: string]: any } = RouterContextT>(opts: DefineRouteOpts): this;
  define<T extends { [key: string]: any } = RouterContextT>(fn: Run<T & U>): this;
  define<T extends { [key: string]: any } = RouterContextT>(key: string, fn: Run<T & U>): this;
  define<T extends { [key: string]: any } = RouterContextT>(path: string, key: string, fn: Run<T & U>): this;
  define(...args: any[]) {
    const [path, key, opts] = args;
    // 全覆盖，所以opts需要准确，不能由idUsePath 需要check的变量
    const setOpts = (opts: DefineRouteOpts) => {
      const keys = Object.keys(opts);
      const checkList = ['path', 'key', 'run', 'nextRoute', 'description', 'metadata', 'middleware', 'type', 'isDebug'];
      for (let item of keys) {
        if (!checkList.includes(item)) {
          continue;
        }
        if (item === 'middleware') {
          this.middleware = this.middleware.concat(opts[item]);
          continue;
        }
        this[item] = opts[item];
      }
    };
    if (typeof path === 'object') {
      setOpts(path);
      return this;
    }
    if (typeof path === 'function') {
      this.run = path;
      return this;
    }
    if (typeof path === 'string' && typeof key === 'function') {
      setOpts({ path, run: key });
      return this;
    }
    if (typeof path === 'string' && typeof key === 'string' && typeof opts === 'function') {
      setOpts({ path, key, run: opts });
      return this;
    }
    return this;
  }

  update(opts: DefineRouteOpts, checkList?: string[]): this {
    const keys = Object.keys(opts);
    const defaultCheckList = ['path', 'key', 'run', 'nextRoute', 'description', 'metadata', 'middleware', 'type', 'isDebug'];
    checkList = checkList || defaultCheckList;
    for (let item of keys) {
      if (!checkList.includes(item)) {
        continue;
      }
      if (item === 'middleware') {
        this.middleware = this.middleware.concat(opts[item]);
        continue;
      }
      this[item] = opts[item];
    }
    return this;
  }
  addTo(router: QueryRouter | { add: (route: Route) => void;[key: string]: any }) {
    router.add(this);
  }
  setData(data: any) {
    this.data = data;
    return this;
  }
  throw(code?: number | string, message?: string, tips?: string): void;
  throw(...args: any[]) {
    throw new CustomError(...args);
  }
}

export class QueryRouter {
  routes: Route[];
  maxNextRoute = 40;
  context?: RouteContext = {}; // default context for call
  constructor() {
    this.routes = [];
  }

  add(route: Route) {
    const has = this.routes.findIndex((r) => r.path === route.path && r.key === route.key);
    if (has !== -1) {
      // remove the old route
      this.routes.splice(has, 1);
    }
    this.routes.push(route);
  }
  /**
   * remove route by path and key
   * @param route
   */
  remove(route: Route | { path: string; key?: string }) {
    this.routes = this.routes.filter((r) => r.path === route.path && r.key == route.key);
  }
  /**
   * remove route by id
   * @param uniqueId
   */
  removeById(unique: string) {
    this.routes = this.routes.filter((r) => r.id !== unique);
  }
  /**
   * 执行route
   * @param path
   * @param key
   * @param ctx
   * @returns
   */
  async runRoute(path: string, key: string, ctx?: RouteContext) {
    const route = this.routes.find((r) => r.path === path && r.key === key);
    const maxNextRoute = this.maxNextRoute;
    ctx = (ctx || {}) as RouteContext;
    ctx.currentPath = path;
    ctx.currentKey = key;
    ctx.currentRoute = route;
    ctx.index = (ctx.index || 0) + 1;
    const progress = [path, key] as [string, string];
    if (ctx.progress) {
      ctx.progress.push(progress);
    } else {
      ctx.progress = [progress];
    }
    if (ctx.index > maxNextRoute) {
      ctx.code = 500;
      ctx.message = 'Too many nextRoute';
      ctx.body = null;
      return;
    }
    // run middleware
    if (route && route.middleware && route.middleware.length > 0) {
      const errorMiddleware: { path?: string; key?: string; id?: string }[] = [];
      const getMiddleware = (m: Route) => {
        if (!m.middleware || m.middleware.length === 0) return [];
        const routeMiddleware: Route[] = [];
        for (let i = 0; i < m.middleware.length; i++) {
          const item = m.middleware[i];
          let route: Route | undefined;
          const isString = typeof item === 'string';
          if (isString) {
            route = this.routes.find((r) => r.id === item);
          } else {
            route = this.routes.find((r) => {
              if (item.id) {
                return r.id === item.id;
              } else {
                // key 可以是空，所以可以不严格验证
                return r.path === item.path && r.key == item.key;
              }
            });
          }
          if (!route) {
            if (isString) {
              errorMiddleware.push({
                id: item as string,
              });
            } else
              errorMiddleware.push({
                path: m?.path,
                key: m?.key,
              });
          }
          const routeMiddlewarePrevious = getMiddleware(route);
          if (routeMiddlewarePrevious.length > 0) {
            routeMiddleware.push(...routeMiddlewarePrevious);
          }
          routeMiddleware.push(route);
        }
        return routeMiddleware;
      };
      const routeMiddleware = getMiddleware(route);
      if (errorMiddleware.length > 0) {
        console.error('middleware not found');
        ctx.body = errorMiddleware;
        ctx.message = 'middleware not found';
        ctx.code = 404;
        return ctx;
      }
      for (let i = 0; i < routeMiddleware.length; i++) {
        const middleware = routeMiddleware[i];
        if (middleware) {
          try {
            await middleware.run(ctx);
          } catch (e) {
            if (route?.isDebug) {
              console.error('=====debug====:middlerware error');
              console.error('=====debug====:', e);
              console.error('=====debug====:[path:key]:', `${route.path}-${route.key}`);
              console.error('=====debug====:', e.message);
            }
            if (e instanceof CustomError || e?.code) {
              ctx.code = e.code;
              ctx.message = e.message;
              ctx.body = null;
            } else {
              console.error(`fn:${route.path}-${route.key}:${route.id}`);
              console.error(`middleware:${middleware.path}-${middleware.key}:${middleware.id}`);
              ctx.code = 500;
              ctx.message = 'Internal Server Error';
              ctx.body = null;
            }
            return ctx;
          }
          if (ctx.end) {
          }
        }
      }
    }
    // run route
    if (route) {
      if (route.run) {
        try {
          await route.run(ctx);
        } catch (e) {
          if (route?.isDebug) {
            console.error('=====debug====:', 'router run error:', e.message);
          }
          if (e instanceof CustomError) {
            ctx.code = e.code;
            ctx.message = e.message;
          } else {
            console.error(`[error]fn:${route.path}-${route.key}:${route.id}`);
            console.error('error', e.message);
            ctx.code = 500;
            ctx.message = 'Internal Server Error';
          }
          ctx.body = null;
          return ctx;
        }
        if (ctx.end) {
          // TODO: 提前结束, 以及错误情况
          return;
        }
        if (route.nextRoute) {
          let path: string, key: string;
          if (route.nextRoute.path || route.nextRoute.key) {
            path = route.nextRoute.path;
            key = route.nextRoute.key;
          } else if (route.nextRoute.id) {
            const nextRoute = this.routes.find((r) => r.id === route.nextRoute.id);
            if (nextRoute) {
              path = nextRoute.path;
              key = nextRoute.key;
            }
          }
          if (!path || !key) {
            ctx.message = 'nextRoute not found';
            ctx.code = 404;
            ctx.body = null;
            return ctx;
          }
          ctx.query = { ...ctx.query, ...ctx.nextQuery };
          ctx.nextQuery = {};
          return await this.runRoute(path, key, ctx);
        }
        if (!ctx.code) ctx.code = 200;
        return ctx;
      } else {
        // return Promise.resolve({ code: 404, body: 'Not found runing' });
        // 可以不需要run的route，因为不一定是错误
        return ctx;
      }
    }
    // 如果没有找到route，返回404，这是因为出现了错误
    return Promise.resolve({ code: 404, body: 'Not found' });
  }
  /**
   * 第一次执行
   * @param message
   * @param ctx
   * @returns
   */
  async parse(message: { path: string; key?: string; payload?: any }, ctx?: RouteContext & { [key: string]: any }) {
    if (!message?.path) {
      return Promise.resolve({ code: 404, body: null, message: 'Not found path' });
    }
    const { path, key = '', payload = {}, ...query } = message;
    ctx = ctx || {};
    ctx.query = { ...ctx.query, ...query, ...payload };
    ctx.state = { ...ctx?.state };
    ctx.throw = this.throw;
    ctx.app = this;
    ctx.call = this.call.bind(this);
    ctx.run = this.run.bind(this);
    ctx.index = 0;
    ctx.progress = ctx.progress || [];
    ctx.forward = (response: { code: number; data?: any; message?: any }) => {
      if (response.code) {
        ctx.code = response.code;
      }
      if (response.data !== undefined) {
        ctx.body = response.data;
      }
      if (response.message !== undefined) {
        ctx.message = response.message;
      }
    }
    const res = await this.runRoute(path, key, ctx);
    const serialize = ctx.needSerialize ?? true; // 是否需要序列化
    if (serialize) {
      res.body = JSON.parse(JSON.stringify(res.body || ''));
    }
    return res;
  }
  /**
   * 返回的数据包含所有的context的请求返回的内容，可做其他处理
   * @param message
   * @param ctx
   * @returns
   */
  async call(message: { id?: string; path?: string; key?: string; payload?: any }, ctx?: RouteContext & { [key: string]: any }) {
    let path = message.path;
    let key = message.key;
    // 优先 path + key
    if (path) {
      return await this.parse({ ...message, path, key }, { ...this.context, ...ctx });
    } else if (message.id) {
      const route = this.routes.find((r) => r.id === message.id);
      if (route) {
        path = route.path;
        key = route.key;
      } else {
        return { code: 404, body: null, message: 'Not found route' };
      }
      return await this.parse({ ...message, path, key }, { ...this.context, ...ctx });
    } else {
      return { code: 404, body: null, message: 'Not found path' };
    }
  }

  /**
   * 请求 result 的数据
   * @param message
   * @param ctx
   * @deprecated use run or call instead
   * @returns
   */
  async queryRoute(message: { id?: string; path: string; key?: string; payload?: any }, ctx?: RouteContext & { [key: string]: any }) {
    const res = await this.call(message, { ...this.context, ...ctx });
    return {
      code: res.code,
      data: res.body,
      message: res.message,
    };
  }
  /**
   * Router Run获取数据
   * @param message 
   * @param ctx 
   * @returns 
   */
  async run(message: { id?: string; path?: string; key?: string; payload?: any }, ctx?: RouteContext & { [key: string]: any }) {
    const res = await this.call(message, { ...this.context, ...ctx });
    return {
      code: res.code,
      data: res.body,
      message: res.message,
    };
  }
  /**
   * 设置上下文
   * @description 这里的上下文是为了在handle函数中使用
   * @param ctx
   */
  setContext(ctx: RouteContext) {
    this.context = ctx;
  }
  getList(filter?: (route: Route) => boolean): RouteInfo[] {
    return this.routes.filter(filter || (() => true)).map((r) => {
      return pick(r, pickValue as any);
    });
  }
  /**
   * 获取handle函数, 这里会去执行parse函数
   */
  getHandle<T = any>(router: QueryRouter, wrapperFn?: HandleFn<T>, ctx?: RouteContext) {
    return async (msg: { id?: string; path?: string; key?: string;[key: string]: any }, handleContext?: RouteContext) => {
      try {
        const context = { ...ctx, ...handleContext };
        const res = await router.call(msg, context);
        if (wrapperFn) {
          res.data = res.body;
          return wrapperFn(res, context);
        }
        const { code, body, message } = res;
        return { code, data: body, message };
      } catch (e) {
        return { code: 500, message: e.message };
      }
    };
  }
  exportRoutes() {
    return this.routes.map((r) => {
      return r;
    });
  }
  importRoutes(routes: Route[]) {
    for (let route of routes) {
      this.add(route);
    }
  }
  importRouter(router: QueryRouter) {
    this.importRoutes(router.routes);
  }
  throw(code?: number | string, message?: string, tips?: string): void;
  throw(...args: any[]) {
    throw new CustomError(...args);
  }
  hasRoute(path: string, key: string = '') {
    return this.routes.find((r) => r.path === path && r.key === key);
  }
  createRouteList(force: boolean = false) {
    const hasListRoute = this.hasRoute('route', 'list');
    if (!hasListRoute || force) {
      const listRoute = new Route('route', 'list', {
        description: '列出当前应用下的所有的路由信息',
        run: async (ctx: RouteContext) => {
          const list = this.getList();
          ctx.body = list;
        },
      });
      this.add(listRoute);
    }
  }
  /**
   * 等待程序运行, 获取到message的数据,就执行
   *
   * emitter = process
   * -- .exit
   * -- .on
   * -- .send
   */
  wait(params?: { path?: string; key?: string; payload?: any }, opts?: { emitter?: any, timeout?: number, getList?: boolean }) {
    const getList = opts?.getList ?? true;
    if (getList) {
      this.createRouteList();
    }
    return listenProcess({ app: this, params, ...opts });
  }
}

type QueryRouterServerOpts = {
  handleFn?: HandleFn;
  context?: RouteContext;
};
interface HandleFn<T = any> {
  (msg: { path: string;[key: string]: any }, ctx?: any): { code: string; data?: any; message?: string;[key: string]: any };
  (res: RouteContext<T>): any;
}
/**
 * QueryRouterServer
 * @description 移除server相关的功能，只保留router相关的功能，和http.createServer不相关，独立
 */
export class QueryRouterServer extends QueryRouter {
  handle: any;
  constructor(opts?: QueryRouterServerOpts) {
    super();
    this.handle = this.getHandle(this, opts?.handleFn, opts?.context);
    this.setContext({ needSerialize: false, ...opts?.context });
  }
  setHandle(wrapperFn?: HandleFn, ctx?: RouteContext) {
    this.handle = this.getHandle(this, wrapperFn, ctx);
  }
  use(path: string, fn: (ctx: any) => any, opts?: RouteOpts) {
    const route = new Route(path, '', opts);
    route.run = fn;
    this.add(route);
  }
  addRoute(route: Route) {
    this.add(route);
  }

  Route = Route;
  route(opts: RouteOpts): Route<Required<RouteContext>>;
  route(path: string, key?: string): Route<Required<RouteContext>>;
  route(path: string, opts?: RouteOpts): Route<Required<RouteContext>>;
  route(path: string, key?: string, opts?: RouteOpts): Route<Required<RouteContext>>;
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
  prompt(description: string): Route<Required<RouteContext>>;
  prompt(description: Function): Route<Required<RouteContext>>;
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

  /**
   * 调用了handle
   * @param param0
   * @returns
   */
  async run(msg: { id?: string; path?: string; key?: string; payload?: any }, ctx?: RouteContext & { [key: string]: any }) {
    const handle = this.handle;
    if (handle) {
      return handle(msg, ctx);
    }
    return super.run(msg, ctx);
  }
}


export class Mini extends QueryRouterServer { }