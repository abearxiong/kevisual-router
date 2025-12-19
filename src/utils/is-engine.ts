export const isNode = typeof process !== 'undefined' && process.versions != null && process.versions.node != null;
export const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined' && typeof document.createElement === 'function';
// @ts-ignore
export const isDeno = typeof Deno !== 'undefined' && typeof Deno.version === 'object' && typeof Deno.version.deno === 'string';
// @ts-ignore
export const isBun = typeof Bun !== 'undefined' && typeof Bun.version === 'string';

export const getEngine = () => {
  if (isBun) {
    return 'bun';
  } else if (isNode) {
    return 'node';
  } else if (isBrowser) {
    return 'browser';
  } else if (isDeno) {
    return 'deno';
  }
  return 'unknown';
};
