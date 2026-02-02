import { getRuntime } from './runtime.ts';
import { glob } from './utils/glob.ts';
type GlobOptions = {
  cwd?: string;
  load?: (args?: any) => Promise<any>;
};

export const getMatchFiles = async (match: string = './*.ts', { cwd = process.cwd() }: GlobOptions = {}): Promise<string[]> => {
  const runtime = getRuntime();
  if (runtime.isNode) {
    console.error(`Node.js is not supported`);
    return [];
  }
  if (runtime.isDeno) {
    // Deno 环境下
    return await glob(match);
  }
  if (runtime.isBun) {
    // Bun 环境下
    const bunPkgs = 'bun';
    const pathPkgs = 'node:path';
    // @ts-ignore
    const { Glob } = await import(/*---*/bunPkgs);
    const path = await import(/*---*/pathPkgs);
    // @ts-ignore
    const glob = new Glob(match, { cwd, absolute: true, onlyFiles: true });
    const files: string[] = [];
    for await (const file of glob.scan('.')) {
      files.push(path.join(cwd, file));
    }
    // @ts-ignore
    return Array.from(files);
  }
  return [];
};

export const loadTS = async (match: string = './*.ts', { cwd = process?.cwd?.(), load }: GlobOptions = {}): Promise<any[]> => {
  const files = await getMatchFiles(match, { cwd });
  return Promise.all(files.map((file) => (load ? load(file) : import(/*---*/file))));
};
