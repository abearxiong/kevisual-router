import http, { IncomingMessage, ServerResponse } from 'http';
import https from 'https';
import http2 from 'http2';
import { handleServer } from './handle-server.ts';
import * as cookie from 'cookie';
export type Listener = (...args: any[]) => void;

type CookieFn = (name: string, value: string, options?: cookie.SerializeOptions, end?: boolean) => void;

export type HandleCtx = {
  req: IncomingMessage & { cookies: Record<string, string> };
  res: ServerResponse & {
    /**
     * cookie 函数， end 参数用于设置是否立即设置到响应头，设置了后面的cookie再设置会覆盖前面的
     */
    cookie: CookieFn; //
  };
};
// 实现函数
export function createHandleCtx(req: IncomingMessage, res: ServerResponse): HandleCtx {
  // 用于存储所有的 Set-Cookie 字符串
  const cookies: string[] = [];
  let handReq = req as HandleCtx['req'];
  let handRes = res as HandleCtx['res'];
  // 扩展 res.cookie 方法
  const cookieFn: CookieFn = (name, value, options = {}, end = true) => {
    // 序列化新的 Cookie
    const serializedCookie = cookie.serialize(name, value, options);
    cookies.push(serializedCookie); // 将新的 Cookie 添加到数组
    if (end) {
      // 如果设置了 end 参数，则立即设置到响应头
      res.setHeader('Set-Cookie', cookies);
    }
  };
  // 解析请求中的现有 Cookie
  const parsedCookies = cookie.parse(req.headers.cookie || '');
  handReq.cookies = parsedCookies;
  handRes.cookie = cookieFn;
  // 返回扩展的上下文
  return {
    req: handReq,
    res: handRes,
  };
}
export type Cors = {
  /**
   * @default '*''
   */
  origin?: string | undefined;
};
export type ServerOpts = {
  /**path default `/api/router` */
  path?: string;
  /**handle Fn */
  handle?: (msg?: { path: string; key?: string; [key: string]: any }, ctx?: { req: http.IncomingMessage; res: http.ServerResponse }) => any;
  cors?: Cors;
  httpType?: 'http' | 'https' | 'http2';
  httpsKey?: string;
  httpsCert?: string;
};
export const resultError = (error: string, code = 500) => {
  const r = {
    code: code,
    message: error,
  };
  return JSON.stringify(r);
};

export class Server {
  path = '/api/router';
  private _server: http.Server | https.Server | http2.Http2SecureServer;
  public handle: ServerOpts['handle'];
  private _callback: any;
  private cors: Cors;
  private hasOn = false;
  private httpType = 'http';
  private options = {
    key: '',
    cert: '',
  };
  constructor(opts?: ServerOpts) {
    this.path = opts?.path || '/api/router';
    this.handle = opts?.handle;
    this.cors = opts?.cors;
    this.httpType = opts?.httpType || 'http';
    this.options = {
      key: opts?.httpsKey || '',
      cert: opts?.httpsCert || '',
    };
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
    this._server = this.createServer();
    const callback = this.createCallback();
    this._server.on('request', callback);
    this._server.listen(...args);
  }
  createServer() {
    let server: http.Server | https.Server | http2.Http2SecureServer;
    const httpType = this.httpType;
    if (httpType === 'https') {
      if (this.options.key && this.options.cert) {
        server = https.createServer({
          key: this.options.key,
          cert: this.options.cert,
        });
        return server;
      } else {
        console.error('https key and cert is required');
        console.log('downgrade to http');
      }
    } else if (httpType === 'http2') {
      if (this.options.key && this.options.cert) {
        server = http2.createSecureServer({
          key: this.options.key,
          cert: this.options.cert,
        });
        return server;
      } else {
        console.error('https key and cert is required');
        console.log('downgrade to http');
      }
    }
    server = http.createServer();
    return server;
  }
  setHandle(handle?: any) {
    this.handle = handle;
  }
  /**
   * get callback
   * @returns
   */
  createCallback() {
    const path = this.path;
    const handle = this.handle;
    const cors = this.cors;
    const _callback = async (req: IncomingMessage, res: ServerResponse) => {
      // only handle /api/router
      if (req.url === '/favicon.ico') {
        return;
      }
      if (res.headersSent) {
        // 程序已经在其他地方响应了
        return;
      }
      if (this.hasOn && !req.url.startsWith(path)) {
        // 其他监听存在，不判断不是当前路径的请求，
        // 也就是不处理!url.startsWith(path)这个请求了
        // 交给其他监听处理
        return;
      }
      if (cors) {
        res.setHeader('Access-Control-Allow-Origin', cors?.origin || '*'); // 允许所有域名的请求访问，可以根据需要设置具体的域名
        res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
        if (req.method === 'OPTIONS') {
          res.end();
          return;
        }
      }
      const url = req.url;
      if (!url.startsWith(path)) {
        res.end(resultError(`not path:[${path}]`));
        return;
      }
      const messages = await handleServer(req, res);
      if (!handle) {
        res.end(resultError('no handle'));
        return;
      }
      try {
        const end = await handle(messages as any, { req, res });
        if (res.writableEnded) {
          // 如果响应已经结束，则不进行任何操作
          return;
        }
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        if (typeof end === 'string') {
          res.end(end);
        } else {
          res.end(JSON.stringify(end));
        }
      } catch (e) {
        console.error(e);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        if (e.code && typeof e.code === 'number') {
          res.end(resultError(e.message || `Router Server error`, e.code));
        } else {
          res.end(resultError('Router Server error'));
        }
      }
    };
    this._callback = _callback;
    return _callback;
  }
  get handleServer() {
    return this._callback;
  }
  set handleServer(fn: any) {
    this._callback = fn;
  }
  /**
   * 兜底监听，当除开 `/api/router` 之外的请求，框架只监听一个api，所以有其他的请求都执行其他的监听
   * @description 主要是为了兼容其他的监听
   * @param listener
   */
  on(listener: Listener | Listener[]) {
    this._server = this._server || this.createServer();
    this._server.removeAllListeners('request');
    this.hasOn = true;
    if (Array.isArray(listener)) {
      listener.forEach((l) => this._server.on('request', l));
    } else {
      this._server.on('request', listener);
    }
    this._server.on('request', this._callback || this.createCallback());
  }
  get callback() {
    return this._callback || this.createCallback();
  }
  get server() {
    return this._server;
  }
}
