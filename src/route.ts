import { nanoid } from 'nanoid';
import { CustomError } from './result/error.ts';
import { Schema, Rule, createSchema } from './validator/index.ts';
import { pick } from './utils/pick.ts';
import { get } from 'lodash-es';

export type RouterContextT = { code?: number; [key: string]: any };
export type RouteContext<T = { code?: number }, S = any> = {
  // run first
  query?: { [key: string]: any };
  // response body
  /** return body */
  body?: number | string | Object;
  /** return code */
  code?: number;
  /** return msg */
  message?: string;
  // 传递状态
  state?: S;
  // transfer data
  currentPath?: string;
  currentKey?: string;
  currentRoute?: Route;
  progress?: [[string, string]][];
  // onlyForNextRoute will be clear after next route
  nextQuery?: { [key: string]: any };
  // end
  end?: boolean;
  // 处理router manager
  // TODO:
  queryRouter?: QueryRouter;
  error?: any;
  /** 请求 route的返回结果，包函ctx */
  call?: (message: { path: string; key?: string; payload?: any }, ctx?: RouteContext & { [key: string]: any }) => Promise<any>;
  /** 请求 route的返回结果，不包函ctx */
  queryRoute?: (message: { path: string; key?: string; payload?: any }, ctx?: RouteContext & { [key: string]: any }) => Promise<any>;
  index?: number;
  throw?: (code?: number | string, message?: string, tips?: string) => void;
} & T;

export type Run<T = any> = (ctx: RouteContext<T>) => Promise<typeof ctx | null | void>;

export type NextRoute = Pick<Route, 'id' | 'path' | 'key'>;
export type RouteOpts = {
  path?: string;
  key?: string;
  id?: string;
  run?: Run;
  nextRoute?: NextRoute; // route to run after this route
  description?: string;
  middleware?: Route[] | string[]; // middleware
  type?: 'route' | 'middleware';
  /**
   * validator: {
   *  packageName: {
   *    type: 'string',
   *    required: true,
   *  },
   * }
   */
  validator?: { [key: string]: Rule };
  schema?: { [key: string]: Schema<any> };
  isVerify?: boolean;
  verify?: (ctx?: RouteContext, dev?: boolean) => boolean;
  verifyKey?: (key: string, ctx?: RouteContext, dev?: boolean) => boolean;
  /**
   * $#$ will be used to split path and key
   */
  idUsePath?: boolean;
  isDebug?: boolean;
};
export type DefineRouteOpts = Omit<RouteOpts, 'idUsePath' | 'verify' | 'verifyKey' | 'nextRoute'>;
const pickValue = ['path', 'key', 'id', 'description', 'type', 'validator', 'middleware'] as const;
export type RouteInfo = Pick<Route, (typeof pickValue)[number]>;
export class Route<U = { [key: string]: any }> {
  path?: string;
  key?: string;
  id?: string;
  share? = false;
  run?: Run;
  nextRoute?: NextRoute; // route to run after this route
  description?: string;
  middleware?: (Route | string)[]; // middleware
  type? = 'route';
  private _validator?: { [key: string]: Rule };
  schema?: { [key: string]: Schema<any> };
  data?: any;
  isVerify?: boolean;
  isDebug?: boolean;
  constructor(path: string, key: string = '', opts?: RouteOpts) {
    path = path.trim();
    key = key.trim();
    this.path = path;
    this.key = key;
    if (opts) {
      this.id = opts.id || nanoid();
      if (!opts.id && opts.idUsePath) {
        this.id = path + '$#$' + key;
      }
      this.run = opts.run;
      this.nextRoute = opts.nextRoute;
      this.description = opts.description;
      this.type = opts.type || 'route';
      this.validator = opts.validator;
      this.middleware = opts.middleware || [];
      this.key = opts.key || key;
      this.path = opts.path || path;
      this.isVerify = opts.isVerify ?? true;
      this.createSchema();
    } else {
      this.isVerify = true;
      this.middleware = [];
      this.id = nanoid();
    }
    this.isDebug = opts?.isDebug ?? false;
  }
  private createSchema() {
    const validator = this.validator;
    const keys = Object.keys(validator || {});
    const schemaList = keys.map((key) => {
      return { [key]: createSchema(validator[key]) };
    });
    const schema = schemaList.reduce((prev, current) => {
      return { ...prev, ...current };
    }, {});
    this.schema = schema;
  }

  /**
   * set validator and create schema
   * @param validator
   */
  set validator(validator: { [key: string]: Rule }) {
    this._validator = validator;
    this.createSchema();
  }
  get validator() {
    return this._validator || {};
  }
  /**
   * has code, body, message in ctx, return ctx if has error
   * @param ctx
   * @param dev
   * @returns
   */
  verify(ctx: RouteContext, dev = false) {
    const query = ctx.query || {};
    const schema = this.schema || {};
    const validator = this.validator;
    const check = () => {
      const queryKeys = Object.keys(validator);
      for (let i = 0; i < queryKeys.length; i++) {
        const key = queryKeys[i];
        const value = query[key];
        if (schema[key]) {
          const result = schema[key].safeParse(value);
          if (!result.success) {
            const path = result.error.errors[0]?.path?.join?.('.properties.');
            let message = 'Invalid params';
            if (path) {
              const keyS = `${key}.properties.${path}.message`;
              message = get(validator, keyS, 'Invalid params') as any;
            }
            throw new CustomError(500, message);
          }
        }
      }
    };
    check();
  }

  /**
   * Need to manully call return ctx fn and configure body, code, message
   * @param key
   * @param ctx
   * @param dev
   * @returns
   */
  verifyKey(key: string, ctx: RouteContext, dev = false) {
    const query = ctx.query || {};
    const schema = this.schema || {};
    const validator = this.validator;
    const check = () => {
      const value = query[key];
      if (schema[key]) {
        try {
          schema[key].parse(value);
        } catch (e) {
          if (dev) {
            return {
              message: validator[key].message || 'Invalid params',
              path: this.path,
              key: this.key,
              error: e.message.toString(),
            };
          }
          return {
            message: validator[key].message || 'Invalid params',
            path: this.path,
            key: this.key,
          };
        }
      }
    };
    const checkRes = check();
    return checkRes;
  }
  setValidator(validator: { [key: string]: Rule }) {
    this.validator = validator;
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
      const checkList = ['path', 'key', 'run', 'nextRoute', 'description', 'middleware', 'type', 'validator', 'isVerify', 'isDebug'];
      for (let item of keys) {
        if (!checkList.includes(item)) {
          continue;
        }
        if (item === 'validator') {
          this.validator = opts[item];
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
  addTo(router: QueryRouter | { add: (route: Route) => void; [key: string]: any }) {
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
    const has = this.routes.find((r) => r.path === route.path && r.key === route.key);
    if (has) {
      // remove the old route
      this.routes = this.routes.filter((r) => r.id !== has.id);
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
    if (ctx.index > maxNextRoute) {
      ctx.code = 500;
      ctx.message = 'Too many nextRoute';
      ctx.body = null;
      return;
    }
    // run middleware
    if (route && route.middleware && route.middleware.length > 0) {
      const errorMiddleware: { path?: string; key?: string; id?: string }[] = [];
      //  TODO: 向上递归执行动作, 暂时不考虑
      const routeMiddleware = route.middleware.map((m) => {
        let route: Route | undefined;
        const isString = typeof m === 'string';
        if (typeof m === 'string') {
          route = this.routes.find((r) => r.id === m);
        } else {
          route = this.routes.find((r) => r.path === m.path && r.key === m.key);
        }
        if (!route) {
          if (isString) {
            errorMiddleware.push({
              id: m as string,
            });
          } else
            errorMiddleware.push({
              path: m?.path,
              key: m?.key,
            });
        }
        return route;
      });
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
          if (middleware?.isVerify) {
            try {
              middleware.verify(ctx);
            } catch (e) {
              if (middleware?.isDebug) {
                console.error('=====debug====:', 'middleware verify error:', e.message);
              }
              ctx.message = e.message;
              ctx.code = 500;
              ctx.body = null;
              return ctx;
            }
          }
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
        if (route?.isVerify) {
          try {
            route.verify(ctx);
          } catch (e) {
            if (route?.isDebug) {
              console.error('=====debug====:', 'verify error:', e.message);
            }
            ctx.message = e.message;
            ctx.code = 500;
            ctx.body = null;
            return ctx;
          }
        }
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
          ctx.query = ctx.nextQuery;
          ctx.nextQuery = {};
          return await this.runRoute(path, key, ctx);
        }
        // clear body
        ctx.body = JSON.parse(JSON.stringify(ctx.body || ''));
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
      return Promise.resolve({ code: 404, body: 'Not found path' });
    }
    const { path, key = '', payload = {}, ...query } = message;
    ctx = ctx || {};
    ctx.query = { ...ctx.query, ...query, ...payload };
    ctx.state = {};
    ctx.throw = this.throw;
    // put queryRouter to ctx
    // TODO: 是否需要queryRouter，函数内部处理router路由执行，这应该是避免去内部去包含的功能过
    ctx.queryRouter = this;
    ctx.call = this.call.bind(this);
    ctx.queryRoute = this.queryRoute.bind(this);
    ctx.index = 0;
    return await this.runRoute(path, key, ctx);
  }
  /**
   * 返回的数据包含所有的context的请求返回的内容，可做其他处理
   * @param message
   * @param ctx
   * @returns
   */
  async call(message: { path: string; key?: string; payload?: any }, ctx?: RouteContext & { [key: string]: any }) {
    return await this.parse(message, { ...this.context, ...ctx });
  }
  /**
   * 请求 result 的数据
   * @param message
   * @param ctx
   * @returns
   */
  async queryRoute(message: { path: string; key?: string; payload?: any }, ctx?: RouteContext & { [key: string]: any }) {
    const res = await this.parse(message, { ...this.context, ...ctx });
    return {
      code: res.code,
      data: res.body,
      message: res.message,
    };
  }
  async setContext(ctx: RouteContext) {
    this.context = ctx;
  }
  getList(): RouteInfo[] {
    return this.routes.map((r) => {
      return pick(r, pickValue as any);
    });
  }
  getHandle<T = any>(router: QueryRouter, wrapperFn?: HandleFn<T>, ctx?: RouteContext) {
    return async (msg: { path: string; key?: string; [key: string]: any }, handleContext?: RouteContext) => {
      try {
        const context = { ...ctx, ...handleContext };
        const res = await router.parse(msg, context);
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
  hasRoute(path: string, key?: string) {
    return this.routes.find((r) => r.path === path && r.key === key);
  }
}

type QueryRouterServerOpts = {
  handleFn?: HandleFn;
  context?: RouteContext;
};
interface HandleFn<T = any> {
  (msg: { path: string; [key: string]: any }, ctx?: any): { code: string; data?: any; message?: string; [key: string]: any };
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
    this.setContext(opts?.context);
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

  /**
   * 等于queryRoute，但是调用了handle
   * @param param0
   * @returns
   */
  async run({ path, key, payload }: { path: string; key?: string; payload?: any }) {
    const handle = this.handle;
    const resultError = (error: string, code = 500) => {
      const r = {
        code: code,
        message: error,
      };
      return r;
    };
    try {
      const end = handle({ path, key, ...payload });
      return end;
    } catch (e) {
      if (e.code && typeof e.code === 'number') {
        return {
          code: e.code,
          message: e.message,
        };
      } else {
        return resultError('Router Server error');
      }
    }
  }
}
