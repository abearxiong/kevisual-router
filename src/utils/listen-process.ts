import { EventEmitter } from "eventemitter3";
import { QueryRouterServer, RouterContextT, RunMessage } from "../route.ts"
import { merge } from 'es-toolkit'
export class MockProcess {
  emitter?: EventEmitter
  process?: NodeJS.Process;
  constructor(opts?: { emitter?: EventEmitter, isNode?: boolean }) {
    this.emitter = opts?.emitter || new EventEmitter();
    const isNode = opts?.isNode ?? true;
    if (isNode) {
      this.process = globalThis?.process;
    }
  }
  send(data?: any, callback?: (err?: Error) => void) {
    if (this.process) {
      this.process?.send?.(data, (err?: Error) => {
        callback(err)
      })
    }
    this.emitter.emit('send', data)
  }
  exit(flag: number = 0) {
    if (this.process) {
      this.process?.exit?.(flag)
    }
    this.emitter.emit('exit', flag)
  }
  on(fn: (msg?: any) => any) {
    if (this.process) {
      this.process.on('message', fn)
    }
    this.emitter.on('message', fn)
  }
  desctroy() {
    if (this.emitter) {
      this.emitter = undefined;
    }
    this.process = undefined;
  }
}
export type ListenProcessParams = {
  message?: RunMessage,
  context?: any
}
export type ListenProcessResponse = {
  // 调用进程的功能
  success?: boolean
  data?: {
    // 调用router的结果
    code?: number
    data?: any
    message?: string
    [key: string]: any
  };
  error?: any
  timestamp?: string
  [key: string]: any
}
export type ListenProcessOptions = {
  app?: QueryRouterServer; // 传入的应用实例
  mockProcess?: MockProcess; // 可选的事件发射器
  params?: ListenProcessParams; // 可选的参数
  timeout?: number; // 可选的超时时间 (单位: 毫秒) 默认 10 分钟
};
export const listenProcess = async ({ app, mockProcess, params = {}, timeout = 10 * 60 * 60 * 1000 }: ListenProcessOptions) => {
  const process = mockProcess || new MockProcess();
  let isEnd = false;
  const timer = setTimeout(() => {
    if (isEnd) return;
    isEnd = true;
    process.send?.({ success: false, error: 'Timeout' }, () => {
      process.exit?.(1);
    });
  }, timeout);

  // 监听来自主进程的消息
  const getParams = async (): Promise<any> => {
    return new Promise((resolve) => {
      process.on((params) => {
        if (isEnd) return;
        isEnd = true;
        clearTimeout(timer);
        resolve(params || {})
      })
    })
  }

  try {
    /**
     * 如果不提供path，默认是main
     */
    const _params = await getParams()
    const mergeParams = merge(params, _params)

    const msg = mergeParams?.message || {};
    const ctx: RouterContextT = mergeParams?.context || {}
    /**
     * 如果没有提供path和id，默认取第一个路由, 而且路由path不是router的
     */
    if (!msg.path && !msg.id) {
      const route = app.routes.find(r => r.path !== 'router')
      msg.id = route?.id
    }
    // 执行主要逻辑
    const result = await app.run(msg, ctx);
    // 发送结果回主进程
    const response = {
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    }

    process.send?.(response, () => {
      process.exit?.(0)
    })
  } catch (error) {
    console.error('Error in listenProcess:', error);
    process.send?.({
      success: false,
      error: error.message
    }, () => {
      process.exit?.(1)
    })
  }
}