import { getRuntime } from '../runtime.ts';

export const getPid = async () => {
  const runtime = getRuntime();

  let pid = 0;
  if (runtime.isDeno) {
    // @ts-ignore
    pid = Deno.pid;
  } else {
    pid = process.pid;
  }
  return pid;
};
export const writeAppid = async (pidPath = './app.pid') => {
  const fs = await import('node:fs');
  const pid = await getPid();
  fs.writeFileSync(pidPath, pid + '');
};

export const getPidFromFileAndStop = async () => {
  const fs = await import('node:fs');
  if (fs.existsSync('./app.pid')) {
    const pid = parseInt(fs.readFileSync('./app.pid', 'utf-8'), 10);
    if (!isNaN(pid)) {
      if (pid === 0) {
        return;
      }
      try {
        process.kill(pid);
        console.log(`Stopped process with PID ${pid}`);
      } catch (error) {
        console.error(`Failed to stop process with PID ${pid}:`);
      }
    }
  }
};

export const runFirstCheck = async (path: string, pidPath: string) => {
  await getPidFromFileAndStop();
  await writeAppid(pidPath);
  try {
    const fs = await import('node:fs');
    if (fs.existsSync(path)) {
      fs.unlinkSync(path);
      console.log(`Socket file ${path} cleaned up during first check`);
    }
  } catch (error) {
    console.error(`Failed to clean up socket file ${path} during first check:`, error);
  }
};
