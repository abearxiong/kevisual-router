import type { IncomingMessage } from 'node:http';
import url from 'node:url';
import { isBun } from '../utils/is-engine.ts';
export const parseBody = async <T = Record<string, any>>(req: IncomingMessage) => {
  const resolveBody = (body: string) => {
    // 获取 Content-Type 头信息
    const contentType = req.headers['content-type'] || '';
    const resolve = (data: T) => {
      return data;
    }
    // 处理 application/json
    if (contentType.includes('application/json')) {
      return resolve(JSON.parse(body) as T);
    }
    // 处理 application/x-www-form-urlencoded
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = new URLSearchParams(body);
      const result: Record<string, any> = {};

      formData.forEach((value, key) => {
        // 尝试将值解析为 JSON，如果失败则保留原始字符串
        try {
          result[key] = JSON.parse(value);
        } catch {
          result[key] = value;
        }
      });

      return resolve(result as T);
    }

    // 默认尝试 JSON 解析
    try {
      return resolve(JSON.parse(body) as T);
    } catch {
      return resolve({} as T);
    }
  }
  if (isBun) {
    // @ts-ignore
    const body = req.body;
    if (body) {
      return resolveBody(body)
    }
    return {} as T;
  }
  return new Promise<T>((resolve, reject) => {
    const arr: any[] = [];
    req.on('data', (chunk) => {
      arr.push(chunk);
    });
    req.on('end', () => {
      try {
        const body = Buffer.concat(arr).toString();
        resolve(resolveBody(body));

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
