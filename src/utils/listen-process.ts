export type ListenProcessOptions = {
  app?: any; // 传入的应用实例
  emitter?: any; // 可选的事件发射器
  params?: any; // 可选的参数
  timeout?: number; // 可选的超时时间 (单位: 毫秒)
};
export const listenProcess = async ({ app, emitter, params, timeout = 10 * 60 * 60 * 1000 }: ListenProcessOptions) => {
  const process = emitter || globalThis.process;
  let isEnd = false;
  const timer = setTimeout(() => {
    if (isEnd) return;
    isEnd = true;
    process.send?.({ success: false, error: 'Timeout' });
    process.exit?.(1);
  }, timeout);

  // 监听来自主进程的消息
  const getParams = async (): Promise<any> => {
    return new Promise((resolve) => {
      process.on('message', (msg) => {
        if (isEnd) return;
        isEnd = true;
        clearTimeout(timer);
        resolve(msg)
      })
    })
  }

  try {
    const { path = 'main', ...rest } = await getParams()
    // 执行主要逻辑
    const result = await app.queryRoute({ path, ...rest, ...params })
    // 发送结果回主进程
    const response = {
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    }

    process.send?.(response, (error) => {
      process.exit?.(0)
    })
  } catch (error) {
    process.send?.({
      success: false,
      error: error.message
    })
    process.exit?.(1)
  }
}