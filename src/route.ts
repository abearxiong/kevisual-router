import { CustomError, throwError, CustomErrorOptions } from './result/error.ts';
import { pick } from './utils/pick.ts';
import { listenProcess, MockProcess } from './utils/listen-process.ts';
import { z } from 'zod';
import { randomId } from './utils/random.ts';
import * as schema from './validator/schema.ts';

export type RouterContextT = { code?: number;[key: string]: any };

type BuildRouteContext<M, U> = M extends { args?: infer A }
  ? A extends z.ZodObject<any>
  ? RouteContext<{ args?: z.infer<A> }, U>
  : A extends Record<string, z.ZodTypeAny>
  ? RouteContext<{ args?: { [K in keyof A]: z.infer<A[K]> } }, U>
  : RouteContext<U>
  : RouteContext<U>;

export type RouteContext<T = { code?: number }, U extends SimpleObject = {}, S = { [key: string]: any }> = {
  /**
   * 本地自己调用的时候使用，可以标识为当前自调用，那么 auth 就不许重复的校验
   * 或者不需要登录的，直接调用
   */
  appId?: string;
  // run first
  query?: { [key: string]: any };
  args?: { [key: string]: any };
  // response body
  /** return body */
  body?: number | string | Object;
  forward?: (response: { code: number, data?: any, message?: any }) => void;
  /** return code */
  code?: number;
  /** return msg */
  message?: string;
  /**
   * 传递状态
   */
  state?: S;
  // transfer data
  /**
   * 当前routerId
   */
  currentId?: string;
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
  run?: (message: { path: string; key?: string; payload?: any }, ctx?: RouteContext) => Promise<any>;
  index?: number;
  throw?: throwError['throw'];
  /** 是否需要序列化, 使用JSON.stringify和JSON.parse */
  needSerialize?: boolean;
} & T & U;
export type SimpleObject = Record<string, any>;
export type Run<T extends SimpleObject = {}> = (ctx: Required<RouteContext<T>>) => Promise<typeof ctx | null | void>;
export type RunMessage = { path?: string; key?: string; id?: string; payload?: any; };
export type NextRoute = Pick<Route, 'id' | 'path' | 'key'>;
export type RouteMiddleware =
  | {
    path?: string;
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
  type?: 'route' | 'middleware' | 'compound'; // compound表示这个 route 作为一个聚合体，没有实际的 run，而是一个 router 的聚合列表
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


export type Skill<T = SimpleObject> = {
  skill: string;
  title: string;
  summary?: string;
  tags?: string[];
  args?: {
    [key: string]: any
  };
} & T
export const tool = {
  schema: z
}
/** */
export const createSkill = <T = SimpleObject>(skill: Skill<T>): Skill<T> => {
  if (skill.tags) {
    const hasOpencode = skill.tags.includes('opencode');
    if (!hasOpencode) {
      skill.tags.push('opencode');
    }
  }
  return {
    args: {},
    ...skill
  };
}

export type RouteInfo = Pick<Route, (typeof pickValue)[number]>;

/**
 * @M 是 route的 metadate的类型，默认是 SimpleObject
 * @U 是 RouteContext 里 state的类型
 */
export class Route<M extends SimpleObject = SimpleObject, U extends SimpleObject = SimpleObject> implements throwError {
  /**
   * 一级路径
   */
  path?: string;
  /**
   * 二级路径
   */
  key?: string;
  id?: string;
  run?: Run<BuildRouteContext<M, U>>;
  nextRoute?: NextRoute; // route to run after this route
  description?: string;
  metadata?: M;
  middleware?: RouteMiddleware[]; // middleware
  type? = 'route';
  /**
   * 是否开启debug，开启后会打印错误信息
   */
  isDebug?: boolean;
  constructor(path: string = '', key: string = '', opts?: RouteOpts) {
    if (!path) {
      path = randomId(8, 'rand-');
    }
    path = path.trim();
    key = key.trim();
    this.path = path;
    this.key = key;
    if (opts) {
      this.id = opts.id || randomId(12, 'rand-');
      if (!opts.id && opts.idUsePath) {
        const delimiter = opts.delimiter ?? '$$';
        this.id = path + delimiter + key;
      }
      this.run = opts.run as Run<BuildRouteContext<M, U>>;
      this.nextRoute = opts.nextRoute;
      this.description = opts.description;
      this.metadata = opts.metadata as M;
      this.type = opts.type || 'route';
      this.middleware = opts.middleware || [];
      this.key = opts.key || key;
      this.path = opts.path || path;
    } else {
      this.middleware = [];
      this.id = randomId(12, 'rand-');
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
  define<T extends { [key: string]: any } = RouterContextT>(fn: Run<T & BuildRouteContext<M, U>>): this;
  define<T extends { [key: string]: any } = RouterContextT>(key: string, fn: Run<T & BuildRouteContext<M, U>>): this;
  define<T extends { [key: string]: any } = RouterContextT>(path: string, key: string, fn: Run<T & BuildRouteContext<M, U>>): this;
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
      this.run = path as Run<BuildRouteContext<M, U>>;
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

  update(opts: DefineRouteOpts, onlyUpdateList?: string[]): this {
    const keys = Object.keys(opts);
    const defaultCheckList = ['path', 'key', 'run', 'nextRoute', 'description', 'metadata', 'middleware', 'type', 'isDebug'];
    const checkList = onlyUpdateList || defaultCheckList;
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
  addTo(router: QueryRouter | { add: (route: Route) => void;[key: string]: any }, opts?: AddOpts) {
    router.add(this, opts);
  }
  throw(...args: any[]) {
    CustomError.throw(...args);
  }
}

const toJSONSchemaRoute = (route: RouteInfo) => {
  const pickValues = pick(route, pickValue as any);
  if (pickValues?.metadata?.args) {
    pickValues.metadata.args = toJSONSchema(pickValues?.metadata?.args, { mergeObject: false });
  }
  return pickValues;
}

export const toJSONSchema = schema.toJSONSchema;
export const fromJSONSchema = schema.fromJSONSchema;

/**
 * @parmas overwrite 是否覆盖已存在的route，默认true
 */
export type AddOpts = { overwrite?: boolean };
export class QueryRouter<T extends SimpleObject = SimpleObject> implements throwError {
  appId: string = '';
  routes: Route[];
  maxNextRoute = 40;
  context?: RouteContext<T> = {} as RouteContext<T>; // default context for call
  constructor() {
    this.routes = [];
  }
  /**
   * add route
   * @param route
   * @param opts
   */
  add(route: Route, opts?: AddOpts) {
    const overwrite = opts?.overwrite ?? true;
    const has = this.routes.findIndex((r) => r.path === route.path && r.key === route.key);

    if (has !== -1) {
      if (!overwrite) {
        return;
      }
      // 如果存在，且overwrite为true，则覆盖
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
  removeById(uniqueId: string) {
    this.routes = this.routes.filter((r) => r.id !== uniqueId);
  }
  /**
   * 执行route
   * @param path
   * @param key
   * @param ctx
   * @returns
   */
  async runRoute(path: string, key: string, ctx?: RouteContext<T>): Promise<RouteContext<T>> {
    const route = this.routes.find((r) => r.path === path && r.key === key);
    const maxNextRoute = this.maxNextRoute;
    ctx = (ctx || {}) as RouteContext<T>;
    ctx.currentPath = path;
    ctx.currentId = route?.id;
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
      return ctx;
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
            await middleware.run(ctx as Required<RouteContext<T>>);
          } catch (e) {
            if (route?.isDebug) {
              console.error('=====debug====:middlerware error');
              console.error('=====debug====:', e);
              console.error('=====debug====:[path:key]:', `${route.path}-${route.key}`);
            }
            if (e instanceof CustomError || e?.code) {
              ctx.code = e.code;
              ctx.message = e.message;
              ctx.body = null;
            } else {
              console.error(`[router error] fn:${route.path}-${route.key}:${route.id}`);
              console.error(`[router error] middleware:${middleware.path}-${middleware.key}:${middleware.id}`);
              console.error(e)
              ctx.code = 500;
              ctx.message = 'Internal Server Error';
              ctx.body = null;
            }
            return ctx;
          }
          if (ctx.end) {
            return ctx;
          }
        }
      }
    }
    // run route
    if (route) {
      if (route.run) {
        try {
          await route.run(ctx as Required<RouteContext<T>>);
        } catch (e) {
          if (route?.isDebug) {
            console.error('=====debug====:route error');
            console.error('=====debug====:', e);
            console.error('=====debug====:[path:key]:', `${route.path}-${route.key}`);
          }
          if (e instanceof CustomError) {
            ctx.code = e.code;
            ctx.message = e.message;
          } else {
            console.error(`[router error] fn:${route.path}-${route.key}:${route.id}`);
            console.error(`[router error] error`, e);
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
          ctx.args = ctx.query;
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
    return Promise.resolve({ code: 404, body: 'Not found' } as RouteContext<T>);
  }
  /**
   * 第一次执行
   * @param message
   * @param ctx
   * @returns
   */
  async parse(message: { path: string; key?: string; payload?: any }, ctx?: RouteContext<T> & { [key: string]: any }) {
    if (!message?.path) {
      return Promise.resolve({ code: 404, body: null, message: 'Not found path' } as RouteContext<T>);
    }
    const { path, key = '', payload = {}, ...query } = message;
    ctx = ctx || {} as RouteContext<T>;
    ctx.query = { ...ctx.query, ...query, ...payload };
    ctx.args = ctx.query;
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
  async call(message: { id?: string; path?: string; key?: string; payload?: any }, ctx?: RouteContext<T> & { [key: string]: any }) {
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
  async run(message: { id?: string; path?: string; key?: string; payload?: any }, ctx?: RouteContext<T> & { [key: string]: any }) {
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
    this.context = ctx as RouteContext<T>;
  }
  getList(filter?: (route: Route) => boolean): RouteInfo[] {
    return this.routes.filter(filter || (() => true)).map((r) => {
      const pickValues = pick(r, pickValue as any);
      return pickValues;
    });
  }
  /**
   * 获取handle函数, 这里会去执行parse函数
   */
  getHandle<T = any>(router: QueryRouter, wrapperFn?: HandleFn, ctx?: RouteContext) {
    return async (msg: { id?: string; path?: string; key?: string;[key: string]: any }, handleContext?: RouteContext<T>) => {
      try {
        const context = { ...ctx, ...handleContext };
        const res = await router.call(msg, context) as any;
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
  throw(...args: any[]) {
    CustomError.throw(...args);
  }
  hasRoute(path: string, key: string = '') {
    return this.routes.find((r) => r.path === path && r.key === key);
  }
  findRoute(opts?: { path?: string; key?: string; id?: string }) {
    const { path, key, id } = opts || {};
    return this.routes.find((r) => {
      if (id) {
        return r.id === id;
      }
      if (path) {
        if (key !== undefined) {
          return r.path === path && r.key === key;
        }
        return r.path === path;
      }
      return false;
    });
  }
  createRouteList(opts?: { force?: boolean, filter?: (route: Route) => boolean, middleware?: string[] }) {
    const hasListRoute = this.hasRoute('router', 'list');
    if (!hasListRoute || opts?.force) {
      const listRoute = new Route('router', 'list', {
        description: '列出当前应用下的所有的路由信息',
        middleware: opts?.middleware || [],
        run: async (ctx: RouteContext) => {
          const tokenUser = ctx.state as unknown as { tokenUser?: any };
          let isUser = !!tokenUser;
          const list = this.getList(opts?.filter).filter((item) => {
            if (item.id === 'auth' || item.id === 'auth-can' || item.id === 'check-auth-admin' || item.id === 'auth-admin') {
              return false;
            }
            return true;
          });
          ctx.body = {
            list: list.map((item) => {
              const route = pick(item, ['id', 'path', 'key', 'description', 'middleware', 'metadata'] as const);
              return toJSONSchemaRoute(route);
            }),
            isUser
          };
        },
      });
      this.add(listRoute);
    }
  }
  /**
   * 等待程序运行, 获取到message的数据,就执行
   * params 是预设参数
   * emitter = process
   * -- .exit
   * -- .on
   * -- .send
   */
  wait(params?: { message: RunMessage }, opts?: {
    mockProcess?: MockProcess,
    timeout?: number,
    getList?: boolean
    force?: boolean
    filter?: (route: Route) => boolean
    routeListMiddleware?: string[]
  }) {
    const getList = opts?.getList ?? true;
    if (getList) {
      this.createRouteList({ force: opts?.force, filter: opts?.filter, middleware: opts?.routeListMiddleware });
    }
    return listenProcess({ app: this as any, params, ...opts });
  }
  toJSONSchema = toJSONSchema;
  fromJSONSchema = fromJSONSchema;
}

type QueryRouterServerOpts<C extends SimpleObject = SimpleObject> = {
  handleFn?: HandleFn;
  context?: RouteContext<C>;
  appId?: string;
  initHandle?: boolean;
};
interface HandleFn<T = any> {
  (msg: { path: string;[key: string]: any }, ctx?: any): { code: string; data?: any; message?: string;[key: string]: any };
  (res: RouteContext<T>): any;
}
/**
 * QueryRouterServer
 * @description 移除server相关的功能，只保留router相关的功能，和http.createServer不相关，独立
 * @template C 自定义 RouteContext 类型
 */
export class QueryRouterServer<C extends SimpleObject = SimpleObject> extends QueryRouter<C> {
  declare appId: string;
  handle: any;
  declare context: RouteContext<C>;
  constructor(opts?: QueryRouterServerOpts<C>) {
    super();
    const initHandle = opts?.initHandle ?? true;
    if (initHandle || opts?.handleFn) {
      this.handle = this.getHandle(this, opts?.handleFn, opts?.context);
    }
    this.setContext({ needSerialize: false, ...opts?.context });
    if (opts?.appId) {
      this.appId = opts.appId;
    } else {
      this.appId = randomId(16);
    }
  }
  setHandle(wrapperFn?: HandleFn, ctx?: RouteContext) {
    this.handle = this.getHandle(this, wrapperFn, ctx);
  }
  addRoute(route: Route, opts?: AddOpts) {
    this.add(route, opts);
  }
  Route = Route;
  route<M extends SimpleObject = SimpleObject>(opts: RouteOpts & { metadata?: M }): Route<M, Required<RouteContext<C>>>;
  route<M extends SimpleObject = SimpleObject>(path: string, opts?: RouteOpts & { metadata?: M }): Route<M, Required<RouteContext<C>>>;
  route<M extends SimpleObject = SimpleObject>(path: string, key?: string): Route<M, Required<RouteContext<C>>>;
  route<M extends SimpleObject = SimpleObject>(path: string, key?: string, opts?: RouteOpts & { metadata?: M }): Route<M, Required<RouteContext<C>>>;
  route<M extends SimpleObject = SimpleObject>(...args: any[]) {
    const [path, key, opts] = args;
    if (typeof path === 'object') {
      return new Route<M, Required<RouteContext<C>>>(path.path, path.key, path);
    }
    if (typeof path === 'string') {
      if (opts) {
        return new Route<M, Required<RouteContext<C>>>(path, key, opts);
      }
      if (key && typeof key === 'object') {
        return new Route<M, Required<RouteContext<C>>>(path, key?.key || '', key);
      }
      return new Route<M, Required<RouteContext<C>>>(path, key);
    }
    return new Route<M, Required<RouteContext<C>>>(path, key, opts);
  }
  prompt(description: string) {
    return new Route(undefined, undefined, { description });
  }

  /**
   * 调用了handle
   * @param param0
   * @returns
   */
  async run(msg: { id?: string; path?: string; key?: string; payload?: any }, ctx?: Partial<RouteContext<C>>) {
    const handle = this.handle;
    if (handle) {
      return handle(msg, ctx);
    }
    return super.run(msg, ctx as RouteContext<C>);
  }

  async runAction<T extends { id?: string; path?: string; key?: string; metadata?: { args?: any } } = {}>(
    api: T,
    payload: RunActionPayload<T>,
    ctx?: RouteContext<C>
  ) {
    const { path, key, id } = api as any;
    return this.run({ path, key, id, payload }, ctx);
  }
}


export class Mini extends QueryRouterServer { }

/** JSON Schema 基本类型映射到 TypeScript 类型 */
type JsonSchemaTypeToTS<T> =
  T extends { type: "string" } ? string :
  T extends { type: "boolean" } ? boolean :
  T extends { type: "number" } ? number :
  T extends { type: "integer" } ? number :
  T extends { type: "object" } ? object :
  T extends { type: "array" } ? any[] :
  any;

/** 将 args shape（key -> JSON Schema 类型）转换为 payload 类型，支持 optional: true 的字段为可选 */
type ArgsShapeToPayload<T> =
  { [K in keyof T as T[K] extends { optional: true } ? never : K]: JsonSchemaTypeToTS<T[K]> } &
  { [K in keyof T as T[K] extends { optional: true } ? K : never]?: JsonSchemaTypeToTS<T[K]> };

/** 处理两种 args 格式：完整 JSON Schema（含 properties）或简单 key->type 映射 */
type ArgsToPayload<T> =
  T extends { type: "object"; properties: infer P }
  ? ArgsShapeToPayload<P>
  : ArgsShapeToPayload<T>;

/** 从 API 定义中提取 metadata.args */
type ExtractArgs<T> =
  T extends { metadata: { args: infer A } } ? A : {};

/** runAction 第二个参数的类型，根据第一个参数的 metadata.args 推断 */
export type RunActionPayload<T> = ArgsToPayload<ExtractArgs<T>>;