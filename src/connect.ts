import { nanoid } from 'nanoid';
import { RouteContext } from './route.ts';

export class Connect {
  path: string;
  key?: string;
  _fn?: (ctx?: RouteContext) => Promise<RouteContext>;
  description?: string;
  connects: { path: string; key?: string }[];
  share = false;

  constructor(path: string) {
    this.path = path;
    this.key = nanoid();
  }
  use(path: string) {
    this.connects.push({ path });
  }
  useList(paths: string[]) {
    paths.forEach((path) => {
      this.connects.push({ path });
    });
  }
  useConnect(connect: Connect) {
    this.connects.push({ path: connect.path, key: connect.key });
  }
  useConnectList(connects: Connect[]) {
    connects.forEach((connect) => {
      this.connects.push({ path: connect.path, key: connect.key });
    });
  }
  getPathList() {
    return this.connects.map((c) => c.path).filter(Boolean);
  }
  set fn(fn: (ctx?: RouteContext) => Promise<RouteContext>) {
    this._fn = fn;
  }
  get fn() {
    return this._fn;
  }
}
export class QueryConnect {
  connects: Connect[];
  constructor() {
    this.connects = [];
  }
  add(connect: Connect) {
    const has = this.connects.find((c) => c.path === connect.path && c.key === connect.key);
    if (has) {
      // remove the old connect
      console.log('[replace connect]:', connect.path, connect.key);
      this.connects = this.connects.filter((c) => c.path !== connect.path && c.key !== connect.key);
    }
    this.connects.push(connect);
  }
  remove(connect: Connect) {
    this.connects = this.connects.filter((c) => c.path !== connect.path && c.key !== connect.key);
  }
  getList() {
    return this.connects.map((c) => {
      return {
        path: c.path,
        key: c.key,
      };
    });
  }
}
