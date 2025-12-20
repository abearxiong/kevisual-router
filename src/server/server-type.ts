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
  onWsClose(ws: WS): void;
  sendConnected(ws: WS): void;
}

export type OnWebSocketOptions = { ws: WS; message: string | Buffer; pathname: string, token?: string, id?: string }
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
}

export type WebSocketListenerFun = (req: WebSocketReq, res: WebSocketRes) => Promise<void> | void;
export type HttpListenerFun = (req: RouterReq, res: RouterRes) => Promise<void> | void;

export type WebSocketReq = {
  emitter?: EventEmitter;
  ws: WS;
  data: any;
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