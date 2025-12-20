import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleServer } from './handle-server.ts';
import * as cookie from './cookie.ts';
import { ServerType, Listener, OnListener, ServerOpts, OnWebSocketOptions, OnWebSocketFn, WebScoketListenerFun, ListenerFun, HttpListenerFun, WS } from './server-type.ts';
import { parseIfJson } from '../utils/parse.ts';
import { EventEmitter } from 'events';
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

export const resultError = (error: string, code = 500) => {
  const r = {
    code: code,
    message: error,
  };
  return JSON.stringify(r);
};

export class ServerBase implements ServerType {
  path = '/api/router';
  _server: any;
  handle: ServerOpts['handle'];
  _callback: any;
  cors: Cors;
  listeners: Listener[] = [];
  emitter = new EventEmitter();
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
    this.customListen(...args);
  }
  /**
   * child class can custom listen method
   * @param args 
   */
  customListen(...args: any[]) {
    console.error('Please use createServer to create server instance');
  }
  get handleServer() {
    return this._callback;
  }
  set handleServer(fn: any) {
    this._callback = fn;
  }
  get callback() {
    return this._callback || this.createCallback();
  }
  get server() {
    return this._server;
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
    const that = this;
    const _callback = async (req: IncomingMessage, res: ServerResponse) => {
      // only handle /api/router
      if (req.url === '/favicon.ico') {
        return;
      }
      const listeners = that.listeners || [];
      for (const item of listeners) {
        const func = item.func as any;
        if (typeof func === 'function' && !item.io) {
          await func(req, res);
        }
      }
      if (res.headersSent) {
        // 程序已经在其他地方响应了
        return;
      }
      if (!req.url.startsWith(path)) {
        // 判断不是当前路径的请求，交给其他监听处理
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
  on(listener: OnListener) {
    this.listeners = [];
    if (typeof listener === 'function') {
      this.listeners.push({ func: listener });
      return;
    }
    if (Array.isArray(listener)) {
      for (const item of listener) {
        if (typeof item === 'function') {
          this.listeners.push({ func: item });
        } else {
          this.listeners.push(item);
        }
      }
    } else {
      this.listeners.push(listener);
    }
  }
  async onWebSocket({ ws, message, pathname, token, id }: OnWebSocketOptions) {
    const listener = this.listeners.find((item) => item.path === pathname && item.io);
    const data: any = parseIfJson(message);

    if (listener) {
      const end = (data: any) => {
        ws.send(JSON.stringify(data));
      }
      (listener.func as WebScoketListenerFun)({
        emitter: this.emitter,
        data,
        token,
        id,
        ws,
      }, { end });
      return;
    }

    if (typeof data === 'string') {
      const cleanMessage = data.trim().replace(/^["']|["']$/g, '');
      if (cleanMessage === 'close') {
        ws.close();
        return;
      }
      if (cleanMessage === 'ping') {
        ws.send('pong');
        return;
      }
    }

    const { type, data: typeData, ...rest } = data;
    if (!type) {
      ws.send(JSON.stringify({ code: 500, message: 'type is required' }));
      return;
    }

    const res = {
      type,
      data: {} as any,
      ...rest,
    };
    const end = (data: any, all?: Record<string, any>) => {
      const result = {
        ...res,
        data,
        ...all,
      };
      ws.send(JSON.stringify(result));
    };


    // 调用 handle 处理消息
    if (type === 'router' && this.handle) {
      try {
        const result = await this.handle(typeData as any);
        end(result);
      } catch (e: any) {
        if (e.code && typeof e.code === 'number') {
          end({
            code: e.code,
            message: e.message,
          });
        } else {
          end({ code: 500, message: 'Router Server error' });
        }
      }
    } else {
      end({ code: 500, message: `${type} server is error` });
    }
  }
  async onWsClose(ws: WS) {
    const id = ws?.data?.id || '';
    if (id) {
      this.emitter.emit('close--' + id, { type: 'close', ws, id });
      setTimeout(() => {
        // 关闭后 5 秒清理监听器, 避免内存泄漏， 理论上原本的自己就应该被清理掉了，这里是保险起见
        this.emitter.removeAllListeners('close--' + id);
        this.emitter.removeAllListeners(id);
      }, 5000);
    }
  }
}
