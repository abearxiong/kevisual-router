import http, { IncomingMessage, ServerResponse } from 'http';
import { handleServer } from './handle-server.ts';

export type Listener = (...args: any[]) => void;

export type Cors = {
  /**
   * @default '*''
   */
  origin?: string | undefined;
};
type ServerOpts = {
  /**path default `/api/router` */
  path?: string;
  /**handle Fn */
  handle?: (msg?: { path: string; key?: string; [key: string]: any }) => any;
  cors?: Cors;
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
  private _server: http.Server;
  public handle: ServerOpts['handle'];
  private _callback: any;
  private cors: Cors;
  private hasOn = false;
  constructor(opts?: ServerOpts) {
    this.path = opts?.path || '/api/router';
    this.handle = opts?.handle;
    this.cors = opts?.cors;
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
    this._server = http.createServer();
    const callback = this.createCallback();
    this._server.on('request', callback);
    this._server.listen(...args);
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
      // res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      if (cors) {
        res.setHeader('Access-Control-Allow-Origin', cors?.origin || '*'); // 允许所有域名的请求访问，可以根据需要设置具体的域名
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
        if (req.method === 'OPTIONS') {
          res.end();
          return;
        }
      }
      res.writeHead(200); // 设置响应头，给予其他api知道headersSent，它已经被响应了

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
        const end = await handle(messages as any);
        if (typeof end === 'string') {
          res.end(end);
        } else {
          res.end(JSON.stringify(end));
        }
      } catch (e) {
        console.error(e);
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
    this._server = this._server || http.createServer();
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
