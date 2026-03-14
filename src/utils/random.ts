import { customAlphabet } from 'nanoid';
import Md5 from 'crypto-js/md5.js';
const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz', 16);

export const randomId = (length: number = 8, affix: string = '') => {
  return affix + nanoid(length);
}
export { nanoid };

/**
 * 基于 MD5 的确定性 ID 生成 (同步版本)
 * 浏览器和 Node.js 都支持
 * 相同的 pathKey 永远返回相同的 16 位 ID
 */
export const hashIdMd5Sync = (pathKey: string): string => {
  return Md5(pathKey).toString().substring(0, 16);
}
