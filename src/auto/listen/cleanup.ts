import { getRuntime } from '../runtime.ts';

let isClean = false;
export const deleteFileDetached = async (path: string, pidPath: string = './app.pid') => {
  const runtime = getRuntime();
  if (runtime.isDeno) {
    // Deno 实现 - 启动后不等待结果
    const process = new Deno.Command('sh', {
      args: ['-c', `rm -f "${path}" & rm -f "${pidPath}"`],
      stdout: 'null',
      stderr: 'null',
    });
    process.spawn(); // 不等待结果
    console.log(`[DEBUG] Fire-and-forget delete initiated for ${path}`);
    return;
  }
  const { spawn } = await import('node:child_process');
  const child = spawn('sh', ['-c', `rm -f "${path}" & rm -f "${pidPath}"`], {
    detached: true,
    stdio: 'ignore',
  });
  child.unref(); // 完全分离
  console.log(`[DEBUG] Fire-and-forget delete initiated for ${path}`);
};

type CleanupOptions = {
  path: string;
  close?: () => Promise<void>;
  pidPath?: string;
};
export const cleanup = async ({ path, close = async () => {}, pidPath = './app.pid' }: CleanupOptions) => {
  const runtime = getRuntime();

  // 检查文件是否存在并删除
  const cleanupFile = async () => {
    if (isClean) return;
    isClean = true;
    if (runtime.isDeno) {
      await deleteFileDetached(path, pidPath);
    }
    await close();
    if (!runtime.isDeno) {
      await deleteFileDetached(path, pidPath);
    }
  };

  // 根据运行时环境注册不同的退出监听器
  if (runtime.isDeno) {
    // Deno 环境
    const handleSignal = () => {
      cleanupFile();
      Deno.exit(0);
    };

    try {
      Deno.addSignalListener('SIGINT', handleSignal);
      Deno.addSignalListener('SIGTERM', handleSignal);
    } catch (error) {
      console.warn('[DEBUG] Failed to add signal listeners:', error);
    }

    // 对于 beforeunload 和 unload，使用异步清理
    const handleUnload = () => {
      cleanupFile();
    };

    globalThis.addEventListener('beforeunload', handleUnload);
    globalThis.addEventListener('unload', handleUnload);
  } else if (runtime.isNode || runtime.isBun) {
    // Node.js 和 Bun 环境
    import('process').then(({ default: process }) => {
      // 信号处理使用同步清理，然后退出
      const signalHandler = async (signal: string) => {
        await cleanupFile();
        process.exit(0);
      };

      process.on('SIGINT', () => signalHandler('SIGINT'));
      process.on('SIGTERM', () => signalHandler('SIGTERM'));
      process.on('SIGUSR1', () => signalHandler('SIGUSR1'));
      process.on('SIGUSR2', () => signalHandler('SIGUSR2'));

      process.on('exit', async () => {
        await cleanupFile();
      });

      process.on('uncaughtException', async (error) => {
        console.error('Uncaught Exception:', error);
        await cleanupFile();
        process.exit(1);
      });

      process.on('unhandledRejection', async (reason, promise) => {
        console.error('Unhandled Rejection at:', promise, 'reason:', reason);
        await cleanupFile();
      });
    });
  }

  // 返回手动清理函数，以便需要时主动调用
  return cleanupFile;
};
