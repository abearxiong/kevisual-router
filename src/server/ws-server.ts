// @ts-type=ws
import { WebSocketServer } from 'ws';
import type { WebSocket } from 'ws';
import { ServerType } from './server-type.ts'
import { parseIfJson } from '../utils/parse.ts';
import { isBun } from '../utils/is-engine.ts';


export const createWsServer = (server: ServerType) => {
  // 将 WebSocket 服务器附加到 HTTP 服务器
  const wss = new WebSocketServer({ server: server.server as any });
  return wss;
};
type WsServerBaseOpts = {
  wss?: WebSocketServer | null;
  path?: string;
};
export type ListenerFn = (message: { data: Record<string, any>; ws: WebSocket; end: (data: any) => any }) => Promise<any>;
export type Listener<T = 'router' | 'chat' | 'ai'> = {
  type: T;
  path?: string;
  listener: ListenerFn;
};

export class WsServerBase {
  wss: WebSocketServer | null;
  listeners: Listener[] = [];
  listening: boolean = false;
  server: ServerType;

  constructor(opts: WsServerBaseOpts) {
    this.wss = opts.wss;
    if (!this.wss && !isBun) {
      throw new Error('wss is required');
    }
  }
  listen() {
    if (this.listening) {
      console.error('WsServer is listening');
      return;
    }
    this.listening = true;

    if (!this.wss) {
      // Bun 环境下，wss 可能为 null
      return;
    }

    this.wss.on('connection', (ws, req) => {
      const url = new URL(req.url, 'http://localhost');
      const pathname = url.pathname;
      const token = url.searchParams.get('token') || '';
      const id = url.searchParams.get('id') || '';
      ws.on('message', async (message: string | Buffer) => {
        await this.server.onWebSocket({ ws, message, pathname, token, id });
      });
      ws.send('connected');
    });
  }
}
// TODO: ws handle and path and routerContext
export class WsServer extends WsServerBase {
  constructor(server: ServerType) {
    const wss = isBun ? null : new WebSocketServer({ noServer: true });
    super({ wss });
    this.server = server;
  }
  listen() {
    if (isBun) {
      // Bun 的 WebSocket 在 Bun.serve 中处理，这里不需要额外操作
      // WebSocket 升级会在 listenWithBun 中处理
      this.listening = true;
      return;
    }
    super.listen();
    const server = this.server;
    const wss = this.wss;

    // HTTP 服务器的 upgrade 事件
    // @ts-ignore
    server.server.on('upgrade', (req, socket, head) => {
      const url = new URL(req.url, 'http://localhost');
      const listenPath = this.server.listeners.map((item) => item.path).filter((item) => item);
      if (listenPath.includes(url.pathname) || url.pathname === this.server.path) {
        wss.handleUpgrade(req, socket, head, (ws) => {
          // 这里手动触发 connection事件
          // @ts-ignore
          wss.emit('connection', ws, req);
        });
      } else {
        socket.destroy();
      }
    });
  }
}
