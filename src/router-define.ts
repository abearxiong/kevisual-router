import type { QueryRouterServer, RouteOpts, Run, RouteMiddleware } from '@kevisual/router';

// export type RouteObject<T extends readonly string[]> = {
//   [K in T[number]]: RouteOpts;
// };
export type { RouteOpts };
export type RouteObject = {
  [key: string]: RouteOpts;
};
type SimpleObject = Record<string, any>;
export function define<T extends Record<string, RouteOpts>>(
  value: T,
): {
  [K in keyof T]: T[K] & RouteOpts;
} {
  return value as { [K in keyof T]: T[K] & RouteOpts };
}

export type RouteArray = RouteOpts[];
type ChainOptions = {
  app: QueryRouterServer;
};
class Chain {
  object: RouteOpts;
  app?: QueryRouterServer;
  constructor(object: RouteOpts, opts?: ChainOptions) {
    this.object = object;
    this.app = opts?.app;
  }
  get key() {
    return this.object.key;
  }
  get path() {
    return this.object.path;
  }
  setDescription(desc: string) {
    this.object.description = desc;
    return this;
  }
  setMeta(metadata: { [key: string]: any }) {
    this.object.metadata = metadata;
    return this;
  }
  setPath(path: string) {
    this.object.path = path;
    return this;
  }
  setMiddleware(middleware: RouteMiddleware[]) {
    this.object.middleware = middleware;
    return this;
  }
  setKey(key: string) {
    this.object.key = key;
    return this;
  }
  setId(key: string) {
    this.object.id = key;
    return this;
  }
  setRun<U extends SimpleObject = {}>(run: Run<U>) {
    this.object.run = run;
    return this;
  }
  define<U extends SimpleObject = {}>(run: Run<U>) {
    this.object.run = run;
    return this;
  }
  createRoute() {
    this.app.route(this.object).addTo(this.app);
    return this;
  }
}
export const util = {
  getChain: (obj: RouteOpts, opts?: ChainOptions) => {
    return new Chain(obj, opts);
  },
};

export class QueryUtil<T extends RouteObject = RouteObject> {
  routeObject: T;
  app: QueryRouterServer;
  constructor(object: T, opts?: ChainOptions) {
    this.routeObject = object;
    this.app = opts?.app;
  }
  static createFormObj<U extends RouteObject>(object: U, opts?: ChainOptions) {
    return new QueryUtil<U>(object, opts);
  }
  static create<U extends Record<string, RouteOpts>>(value: U, opts?: ChainOptions) {
    const obj = value as { [K in keyof U]: U[K] & RouteOpts };
    return new QueryUtil<U>(obj, opts);
  }
  get<K extends keyof T>(key: K): RouteOpts {
    return this.routeObject[key] as RouteOpts;
  }
  chain<K extends keyof T>(key: K, opts?: ChainOptions) {
    const obj = this.routeObject[key];
    let newOpts = { app: this.app, ...opts };
    return new Chain(obj, newOpts);
  }
  queryChain<K extends keyof T>(key: K): (queryData?: Record<string, any>) => RouteOpts {
    const value = this.routeObject[key];
    return (queryData?: Record<string, any>) => {
      return {
        ...value,
        ...queryData,
      };
    };
  }
}
