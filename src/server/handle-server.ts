import http, { IncomingMessage, Server, ServerResponse } from 'http';
import { parseBody } from './parse-body.ts';
import url from 'url';
import { createHandleCtx } from './server.ts';

/**
 * get params and body
 * @param req
 * @param res
 * @returns
 */
export const handleServer = async (req: IncomingMessage, res: ServerResponse) => {
  if (req.url === '/favicon.ico') {
    return;
  }
  const can = ['get', 'post'];
  const method = req.method.toLocaleLowerCase();
  if (!can.includes(method)) {
    return;
  }
  const parsedUrl = url.parse(req.url, true);
  // 获取token
  let token = req.headers['authorization'] || '';
  const handle = createHandleCtx(req, res);
  const cookies = handle.req.cookies;
  if (!token) {
    token = cookies.token; // cookie优先
  }
  if (token) {
    token = token.replace('Bearer ', '');
  }
  // 获取查询参数
  const param = parsedUrl.query;
  let body: Record<any, any>;
  if (method === 'post') {
    body = await parseBody(req);
  }
  if (param?.payload && typeof param.payload === 'string') {
    try {
      const payload = JSON.parse(param.payload as string);
      param.payload = payload;
    } catch (e) {
      console.error(e);
    }
  }
  const data = {
    token,
    ...param,
    ...body,
    cookies,
  };
  return data;
};
