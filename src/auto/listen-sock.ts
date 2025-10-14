import type { IncomingMessage } from 'http';
import { QueryRouterServer } from '../route.ts';
import { getRuntime } from './runtime.ts';
import { runFirstCheck } from './listen/run-check.ts';
import { cleanup } from './listen/cleanup.ts';
import { ServerTimer } from './listen/server-time.ts';

type ListenSocketOptions = {
  /**
   * Unix socket path, defaults to './app.sock'
   */
  path?: string;
  app?: QueryRouterServer;
  /**
   * Unix socket path, defaults to './app.pid'
   */
  pidPath?: string;
  /**
   * Timeout for the server, defaults to 15 minutes.
   * If the server is not responsive for this duration, it will be terminated
   */
  timeout?: number;
};

const server = async (req, app: QueryRouterServer) => {
  const runtime = getRuntime();
  let data;
  if (!runtime.isNode) {
    data = await getRequestParams(req);
  } else {
    data = await parseBody(req);
  }
  // @ts-ignore
  const serverTimer = app.serverTimer;
  if (serverTimer) {
    serverTimer?.run?.();
  }
  const result = await app.queryRoute(data as any);
  const response = new Response(JSON.stringify(result));
  response.headers.set('Content-Type', 'application/json');
  return response;
};
export const closeListenSocket = () => {
  console.log('Closing listen socket');
  process.emit('SIGINT');
};
export const serverTimer = new ServerTimer();
export const listenSocket = async (options?: ListenSocketOptions) => {
  const path = options?.path || './app.sock';
  const pidPath = options?.pidPath || './app.pid';
  const timeout = options?.timeout || 24 * 60 * 60 * 1000; // 24 hours
  const runtime = getRuntime();

  serverTimer.timeout = timeout;
  serverTimer.startTimer();
  serverTimer.onTimeout = closeListenSocket;

  let app = options?.app || globalThis.context?.app;
  if (!app) {
    app = new QueryRouterServer();
  }
  app.serverTimer = serverTimer;
  await runFirstCheck(path, pidPath);
  let close = async () => {};
  cleanup({ path, close });
  if (runtime.isDeno) {
    // 检查 Deno 版本是否支持 Unix domain socket
    try {
      // @ts-ignore
      const listener = Deno.listen({
        transport: 'unix',
        path: path,
      });

      // 处理连接
      (async () => {
        for await (const conn of listener) {
          (async () => {
            // @ts-ignore
            const httpConn = Deno.serveHttp(conn);
            for await (const requestEvent of httpConn) {
              try {
                const response = await server(requestEvent.request, app);
                await requestEvent.respondWith(response);
              } catch (error) {
                await requestEvent.respondWith(new Response('Internal Server Error', { status: 500 }));
              }
            }
          })();
        }
      })();
      close = async () => {
        listener.close();
      };
      return listener;
    } catch (error) {
      // 如果 Unix socket 不支持，回退到 HTTP 服务器
      console.warn('Unix socket not supported in this Deno environment, falling back to HTTP server');

      // @ts-ignore
      const listener = Deno.listen({ port: 0 }); // 使用随机端口

      // @ts-ignore
      console.log(`Deno server listening on port ${listener.addr.port}`);

      (async () => {
        for await (const conn of listener) {
          (async () => {
            // @ts-ignore
            const httpConn = Deno.serveHttp(conn);
            for await (const requestEvent of httpConn) {
              try {
                const response = await server(requestEvent.request, app);
                await requestEvent.respondWith(response);
              } catch (error) {
                await requestEvent.respondWith(new Response('Internal Server Error', { status: 500 }));
              }
            }
          })();
        }
      })();

      return listener;
    }
  }

  if (runtime.isBun) {
    // @ts-ignore
    const bunServer = Bun.serve({
      unix: path,
      fetch(req) {
        return server(req, app);
      },
    });
    close = async () => {
      await bunServer.stop();
    };
    return bunServer;
  }

  // Node.js 环境
  const http = await import('http');

  const httpServer = http.createServer(async (req, res) => {
    try {
      const response = await server(req, app);

      // 设置响应头
      response.headers.forEach((value, key) => {
        res.setHeader(key, value);
      });

      // 设置状态码
      res.statusCode = response.status;

      // 读取响应体并写入
      const body = await response.text();
      res.end(body);
    } catch (error) {
      console.error('Error handling request:', error);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });

  httpServer.listen(path);
  close = async () => {
    httpServer.close();
  };
  return httpServer;
};

export const getRequestParams = async (req: Request) => {
  let urlParams: Record<string, any> = {};
  let bodyParams: Record<string, any> = {};

  // 获取URL参数
  const url = new URL(req.url);
  for (const [key, value] of url.searchParams.entries()) {
    // 尝试解析JSON payload
    if (key === 'payload') {
      try {
        urlParams[key] = JSON.parse(value);
      } catch {
        urlParams[key] = value;
      }
    } else {
      urlParams[key] = value;
    }
  }

  // 获取body参数
  if (req.method.toLowerCase() === 'post' && req.body) {
    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        bodyParams = await req.json();
      } catch {
        // 如果解析失败，保持空对象
      }
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.text();
      const params = new URLSearchParams(formData);
      for (const [key, value] of params.entries()) {
        bodyParams[key] = value;
      }
    } else if (contentType.includes('multipart/form-data')) {
      try {
        const formData = await req.formData();
        for (const [key, value] of formData.entries()) {
          // @ts-ignore
          bodyParams[key] = value instanceof File ? value : value.toString();
        }
      } catch {
        // 如果解析失败，保持空对象
      }
    }
  }

  // body参数优先，合并数据
  return {
    ...urlParams,
    ...bodyParams,
  };
};

export const parseBody = async <T = Record<string, any>>(req: IncomingMessage) => {
  return new Promise<T>((resolve, reject) => {
    const arr: any[] = [];
    req.on('data', (chunk) => {
      arr.push(chunk);
    });
    req.on('end', () => {
      try {
        const body = Buffer.concat(arr).toString();

        // 获取 Content-Type 头信息
        const contentType = req.headers['content-type'] || '';

        // 处理 application/json
        if (contentType.includes('application/json')) {
          resolve(JSON.parse(body) as T);
          return;
        }
        // 处理 application/x-www-form-urlencoded
        if (contentType.includes('application/x-www-form-urlencoded')) {
          const formData = new URLSearchParams(body);
          const result: Record<string, any> = {};

          formData.forEach((value, key) => {
            // 尝试将值解析为 JSON，如果失败则保留原始字符串
            try {
              result[key] = JSON.parse(value);
            } catch {
              result[key] = value;
            }
          });

          resolve(result as T);
          return;
        }

        // 默认尝试 JSON 解析
        try {
          resolve(JSON.parse(body) as T);
        } catch {
          resolve({} as T);
        }
      } catch (e) {
        resolve({} as T);
      }
    });
  });
};
