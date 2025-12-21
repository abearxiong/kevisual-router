import EventEmitter from 'node:events';
import * as http from 'node:http';


export type Cors = {
  /**
   * @default '*''
   */
  origin?: string | undefined;
};

export type ServerOpts<T = {}> = {
  /**path default `/api/router` */
  path?: string;
  /**handle Fn */
  handle?: (msg?: { path: string; key?: string;[key: string]: any }, ctx?: { req: http.IncomingMessage; res: http.ServerResponse }) => any;
  cors?: Cors;
  io?: boolean;
  showConnected?: boolean;
} & T;

export interface ServerType {
  path?: string;
  server?: any;
  handle: ServerOpts['handle'];
  setHandle(handle?: any): void;
  listeners: Listener[];
  listen(port: number, hostname?: string, backlog?: number, listeningListener?: () => void): void;
  listen(port: number, hostname?: string, listeningListener?: () => void): void;
  listen(port: number, backlog?: number, listeningListener?: () => void): void;
  listen(port: number, listeningListener?: () => void): void;
  listen(path: string, backlog?: number, listeningListener?: () => void): void;
  listen(path: string, listeningListener?: () => void): void;
  listen(handle: any, backlog?: number, listeningListener?: () => void): void;
  listen(handle: any, listeningListener?: () => void): void;
  /**
   * 兜底监听，当除开 `/api/router` 之外的请求，框架只监听一个api，所以有其他的请求都执行其他的监听
   * @description 主要是为了兼容其他的监听
   * @param listener
   */
  on(listener: OnListener): void;
  onWebSocket({ ws, message, pathname, token, id }: OnWebSocketOptions): void;
  onWsClose<T = {}>(ws: WS<T>): void;
  sendConnected<T = {}>(ws: WS<T>): void;
}

export type OnWebSocketOptions<T = {}> = {
  ws: WS<T>;
  message: string | Buffer;
  pathname: string,
  token?: string,
  id?: string,
}
export type OnWebSocketFn = (options: OnWebSocketOptions) => Promise<void> | void;
export type WS<T = {}> = {
  send: (data: any) => void;
  close: (code?: number, reason?: string) => void;
  data?: {
    url: URL;
    pathname: string;
    token?: string;
    id?: string;
    /**
     * 鉴权后的获取的信息
     */
    userApp?: string;
  } & T;
}
export type Listener = {
  id?: string;
  io?: boolean;
  path?: string;
  func: WebSocketListenerFun | HttpListenerFun;
  /**
 * @description 是否默认解析为 JSON，如果为 true，则 message 会被 JSON.parse 处理，默认是 true
 */
  json?: boolean,
}

export type WebSocketListenerFun = (req: WebSocketReq, res: WebSocketRes) => Promise<void> | void;
export type HttpListenerFun = (req: RouterReq, res: RouterRes) => Promise<void> | void;

export type WebSocketReq<T = {}, U = Record<string, any>> = {
  emitter?: EventEmitter;
  ws: WS<T>;
  data?: U;
  message?: string | Buffer;
  pathname?: string;
  token?: string;
  id?: string;
}
export type WebSocketRes = {
  end: (data: any) => void;
}
export type ListenerFun = WebSocketListenerFun | HttpListenerFun;;
export type OnListener = Listener | ListenerFun | (Listener | ListenerFun)[];
export type RouterReq<T = {}> = {
  url: string;
  method: string;
  headers: Record<string, string>;
  socket?: {
    remoteAddress?: string;
    remotePort?: number;
  };
  body?: string;
  cookies?: Record<string, string>;
} & T;

export type RouterRes<T = {}> = {
  statusCode: number;
  headersSent: boolean;
  _headers: Record<string, string | string[]>;
  _bodyChunks: any[];
  writableEnded: boolean;
  writeHead: (statusCode: number, headers?: Record<string, string>) => void;
  setHeader: (name: string, value: string | string[]) => void;
  cookie: (name: string, value: string, options?: any) => void;
  write: (chunk: any) => void;
  pipe: (stream: any) => void;
  end: (data?: any) => void;
} & T;