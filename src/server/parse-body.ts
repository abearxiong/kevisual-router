import type { IncomingMessage } from 'node:http';
import url from 'node:url';

export const parseBody = async <T = Record<string, any>>(req: IncomingMessage) => {
  return new Promise<T>((resolve, reject) => {
    const arr: any[] = [];
    req.on('data', (chunk) => {
      arr.push(chunk);
    });
    req.on('end', () => {
      try {
        const body = Buffer.concat(arr).toString();
        resolve(JSON.parse(body));
      } catch (e) {
        resolve({} as T);
      }
    });
  });
};

export const parseSearch = (req: IncomingMessage) => {
  const parsedUrl = url.parse(req.url, true);
  return parsedUrl.query;
};

/**
 * 把url当个key 的 value 的字符串转成json
 * @param value
 */
export const parseSearchValue = (value?: string, opts?: { decode?: boolean }) => {
  if (!value) return {};
  const decode = opts?.decode ?? false;
  if (decode) {
    value = decodeURIComponent(value);
  }
  try {
    return JSON.parse(value);
  } catch (e) {
    return {};
  }
};
