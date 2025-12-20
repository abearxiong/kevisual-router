import * as http from 'http';

export type Listener = {
  id?: string;
  io?: boolean;
  path?: string;
  fun: (...args: any[]) => Promise<void> | void;
}
export type ListenerFun = (...args: any[]) => Promise<void> | void;
export type OnListener = Listener | ListenerFun | (Listener | ListenerFun)[];
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
  onWebSocket({ ws, message, pathname, token, id }: { ws: WS; message: string | Buffer; pathname: string, token?: string, id?: string }): void;
}

type WS = {
  send: (data: any) => void;
  close: () => void;
}

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