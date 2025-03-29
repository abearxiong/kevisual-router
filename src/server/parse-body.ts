import * as http from 'http';
import url from 'url';

export const parseBody = async <T = Record<string, any>>(req: http.IncomingMessage) => {
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

export const parseSearch = (req: http.IncomingMessage) => {
  const parsedUrl = url.parse(req.url, true);
  return parsedUrl.query;
};
