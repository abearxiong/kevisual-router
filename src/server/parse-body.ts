import * as http from 'http';

export const parseBody = async (req: http.IncomingMessage) => {
  return new Promise((resolve, reject) => {
    const arr: any[] = [];
    req.on('data', (chunk) => {
      arr.push(chunk);
    });
    req.on('end', () => {
      try {
        const body = Buffer.concat(arr).toString();
        resolve(JSON.parse(body));
      } catch (e) {
        resolve({});
      }
    });
  });
};
