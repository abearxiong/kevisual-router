/**
 * @title Bun Server Implementation
 * @description Bun 服务器实现,提供基于 Bun.serve 的 HTTP 和 WebSocket 功能
 * @tags bun, server, websocket, http
 * @createdAt 2025-12-20
 */
import { ServerType, type ServerOpts, type Cors, RouterRes, RouterReq } from './server-type.ts';
import { ServerBase } from './server-base.ts';

export class BunServer extends ServerBase implements ServerType {
  declare _server: any;
  declare _callback: any;
  declare cors: Cors;
  constructor(opts?: ServerOpts) {
    super(opts);
  }
  customListen(...args: any[]): void {
    this.listenWithBun(...args);
  }
  /**
   * Bun 运行时的 listen 实现
   */
  private listenWithBun(...args: any[]) {
    // @ts-ignore - Bun 全局 API
    if (typeof Bun === 'undefined' || !Bun.serve) {
      throw new Error('Bun runtime not detected');
    }

    let port: number = 3000;
    let hostname: string = 'localhost';
    let callback: (() => void) | undefined;

    // 解析参数
    if (typeof args[0] === 'number') {
      port = args[0];
      if (typeof args[1] === 'string') {
        hostname = args[1];
        callback = args[2] || args[3];
      } else if (typeof args[1] === 'function') {
        callback = args[1];
      } else {
        callback = args[2];
      }
    }

    const requestCallback = this.createCallback() as unknown as (req: RouterReq, res: RouterRes) => void;
    const wsPath = this.path;
    // @ts-ignore
    this._server = Bun.serve({
      port,
      hostname,
      idleTimeout: 0, // 4 minutes idle timeout (max 255 seconds)
      fetch: async (request: Bun.BunRequest, server: any) => {
        const host = request.headers.get('host') || 'localhost';
        const clientInfo = server.requestIP(request); // 返回 { address: string, port: number } 或 null
        const url = new URL(request.url, `http://${host}`);
        // 处理 WebSocket 升级请求
        if (request.headers.get('upgrade') === 'websocket') {
          const listenPath = this.listeners.map((item) => item.path).filter((item) => item);
          if (listenPath.includes(url.pathname) || url.pathname === wsPath) {
            const token = url.searchParams.get('token') || '';
            const id = url.searchParams.get('id') || '';
            const upgraded = server.upgrade(request, {
              data: { url: url, pathname: url.pathname, token, id },
            });
            if (upgraded) {
              return undefined; // WebSocket 连接成功
            }
          }
          return new Response('WebSocket upgrade failed', { status: 400 });
        }

        // 将 Bun 的 Request 转换为 Node.js 风格的 req/res
        return new Promise((resolve) => {
          const req: RouterReq = {
            url: url.pathname + url.search,
            method: request.method,
            headers: Object.fromEntries(request.headers.entries()),
            socket: {
              // @ts-ignore
              remoteAddress: request?.remoteAddress || request?.ip || clientInfo?.address || '',
              remotePort: clientInfo?.port || 0,
            }
          };

          const res: RouterRes = {
            statusCode: 200,
            headersSent: false,
            writableEnded: false,
            _headers: {} as Record<string, string | string[]>,
            _bodyChunks: [] as any[],
            writeHead(statusCode: number, headers: Record<string, string | string[]>) {
              this.statusCode = statusCode;
              for (const key in headers) {
                this._headers[key] = headers[key];
              }
              this.headersSent = true;
            },
            setHeader(name: string, value: string | string[]) {
              this._headers[name] = value;
            },
            cookie(name: string, value: string, options?: any) {
              let cookieString = `${name}=${value}`;
              if (options) {
                if (options.maxAge) {
                  cookieString += `; Max-Age=${options.maxAge}`;
                }
                if (options.domain) {
                  cookieString += `; Domain=${options.domain}`;
                }
                if (options.path) {
                  cookieString += `; Path=${options.path}`;
                }
                if (options.expires) {
                  cookieString += `; Expires=${options.expires.toUTCString()}`;
                }
                if (options.httpOnly) {
                  cookieString += `; HttpOnly`;
                }
                if (options.secure) {
                  cookieString += `; Secure`;
                }
                if (options.sameSite) {
                  cookieString += `; SameSite=${options.sameSite}`;
                }
              }
              this.setHeader('Set-Cookie', cookieString);
            },
            write(chunk: any, encoding?: string | Function, callback?: Function) {
              if (typeof encoding === 'function') {
                callback = encoding;
                encoding = 'utf8';
              }
              if (!this._bodyChunks) {
                this._bodyChunks = [];
              }
              this._bodyChunks.push(chunk);
              if (callback) callback();
              return true;
            },
            pipe(stream: any) {
              this.writableEnded = true;

              // 如果是 ReadableStream，直接使用
              if (stream instanceof ReadableStream) {
                resolve(
                  new Response(stream, {
                    status: this.statusCode,
                    headers: this._headers as any,
                  })
                );
                return;
              }

              // 如果是 Node.js 流，转换为 ReadableStream
              const readableStream = new ReadableStream({
                start(controller) {
                  stream.on('data', (chunk: any) => {
                    controller.enqueue(chunk);
                  });
                  stream.on('end', () => {
                    controller.close();
                  });
                  stream.on('error', (err: any) => {
                    controller.error(err);
                  });
                },
                cancel() {
                  if (stream.destroy) {
                    stream.destroy();
                  }
                }
              });

              resolve(
                new Response(readableStream, {
                  status: this.statusCode,
                  headers: this._headers as any,
                })
              );
            },
            end(data?: string) {
              this.writableEnded = true;

              // 合并所有写入的数据块
              let responseData: string | Buffer = data;
              if (this._bodyChunks && this._bodyChunks.length > 0) {
                if (data) this._bodyChunks.push(data);
                // 处理 Buffer 和字符串混合的情况
                const hasBuffer = this._bodyChunks.some(chunk => chunk instanceof Buffer || chunk instanceof Uint8Array);
                if (hasBuffer) {
                  // 如果有 Buffer，转换所有内容为 Buffer 后合并
                  const buffers = this._bodyChunks.map(chunk => {
                    if (chunk instanceof Buffer) return chunk;
                    if (chunk instanceof Uint8Array) return Buffer.from(chunk);
                    return Buffer.from(String(chunk));
                  });
                  responseData = Buffer.concat(buffers);
                } else {
                  // 纯字符串，直接拼接
                  responseData = this._bodyChunks.map(chunk => String(chunk)).join('');
                }
              }

              resolve(
                new Response(responseData as any, {
                  status: this.statusCode,
                  headers: this._headers as any,
                })
              );
            },
          };
          // 处理请求体
          if (request.method !== 'GET' && request.method !== 'HEAD') {
            request.text().then((body) => {
              (req as any).body = body;
              requestCallback(req, res);
            });
          } else {
            requestCallback(req, res);
          }
        });
      },
      websocket: {
        open: (ws: any) => {
          ws.send(JSON.stringify({ type: 'connected' }));
        },
        message: async (ws: any, message: string | Buffer) => {
          const pathname = ws.data.pathname || '';
          const token = ws.data.token || '';
          const id = ws.data.id || '';
          await this.onWebSocket({ ws, message, pathname, token, id });
        },
        close: (ws: any) => {
          // WebSocket 连接关闭
          this.onWsClose(ws);
        },
      },
    });

    if (callback) {
      callback();
    }
  }
}
