import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz', 16);

export const randomId = (length: number = 8, affix: string = '') => {
  return affix + nanoid(length);
}
export { nanoid };