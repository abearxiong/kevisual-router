import { WebSocketServer } from 'ws';
import type { WebSocket } from 'ws';
import { Server } from './server.ts';
import { parseIfJson } from '../utils/parse.ts';

export const createWsServer = (server: Server) => {
  // 将 WebSocket 服务器附加到 HTTP 服务器
  const wss = new WebSocketServer({ server: server.server as any });
  return wss;
};
type WsServerBaseOpts = {
  wss?: WebSocketServer;
  path?: string;
};
export type ListenerFn = (message: { data: Record<string, any>; ws: WebSocket; end: (data: any) => any }) => Promise<any>;
export type Listener<T = 'router' | 'chat' | 'ai'> = {
  type: T;
  listener: ListenerFn;
};

export class WsServerBase {
  wss: WebSocketServer;
  path: string;
  listeners: { type: string; listener: ListenerFn }[] = [];
  listening: boolean = false;
  constructor(opts: WsServerBaseOpts) {
    this.wss = opts.wss;
    if (!this.wss) {
      throw new Error('wss is required');
    }
    this.path = opts.path || '';
  }
  setPath(path: string) {
    this.path = path;
  }
  listen() {
    if (this.listening) {
      console.error('WsServer is listening');
      return;
    }
    this.listening = true;

    this.wss.on('connection', (ws) => {
      ws.on('message', async (message: string) => {
        const data = parseIfJson(message);
        if (typeof data === 'string') {
          ws.emit('string', data);
          return;
        }
        const { type, data: typeData, ...rest } = data;
        if (!type) {
          ws.send(JSON.stringify({ code: 500, message: 'type is required' }));
        }
        const listeners = this.listeners.find((item) => item.type === type);
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

        if (!listeners) {
          const data = { code: 500, message: `${type} server is error` };
          end(data);
          return;
        }
        listeners.listener({
          data: typeData,
          ws,
          end: end,
        });
      });
      ws.on('string', (message: string) => {
        if (message === 'close') {
          ws.close();
        }
        if (message === 'ping') {
          ws.send('pong');
        }
      });
      ws.send('connected');
    });
  }
  addListener(type: string, listener: ListenerFn) {
    if (!type || !listener) {
      throw new Error('type and listener is required');
    }
    const find = this.listeners.find((item) => item.type === type);
    if (find) {
      this.listeners = this.listeners.filter((item) => item.type !== type);
    }
    this.listeners.push({ type, listener });
  }
  removeListener(type: string) {
    this.listeners = this.listeners.filter((item) => item.type !== type);
  }
}
// TODO: ws handle and path and routerContext
export class WsServer extends WsServerBase {
  server: Server;
  constructor(server: Server, opts?: any) {
    const wss = new WebSocketServer({ noServer: true });
    const path = server.path;
    super({ wss });
    this.server = server;
    this.setPath(opts?.path || path);
    this.initListener();
  }
  initListener() {
    const server = this.server;
    const listener: Listener = {
      type: 'router',
      listener: async ({ data, ws, end }) => {
        if (!server) {
          end({ code: 500, message: 'server handle is error' });
          return;
        }
        const handle = this.server.handle;
        try {
          const result = await handle(data as any);
          end(result);
        } catch (e) {
          if (e.code && typeof e.code === 'number') {
            end({
              code: e.code,
              message: e.message,
            });
          } else {
            end({ code: 500, message: 'Router Server error' });
          }
        }
      },
    };
    this.addListener(listener.type, listener.listener);
  }
  listen() {
    super.listen();
    const server = this.server;
    const wss = this.wss;
    // HTTP 服务器的 upgrade 事件
    server.server.on('upgrade', (req, socket, head) => {
      if (req.url === this.path) {
        wss.handleUpgrade(req, socket, head, (ws) => {
          // 这里手动触发 connection 事件
          // @ts-ignore
          wss.emit('connection', ws, req);
        });
      } else {
        socket.destroy();
      }
    });
  }
}
