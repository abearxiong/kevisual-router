type RuntimeEngine = 'node' | 'deno' | 'bun';

type Runtime = {
  isNode?: boolean;
  isDeno?: boolean;
  isBun?: boolean;
  engine: RuntimeEngine;
};
export const getRuntime = (): Runtime => {
  // @ts-ignore
  if (typeof Deno !== 'undefined') {
    return { isDeno: true, engine: 'deno' };
  }
  // @ts-ignore
  if (typeof Bun !== 'undefined') {
    return { isBun: true, engine: 'bun' };
  }
  return { isNode: true, engine: 'node' };
};
