import xml2js from 'xml2js';
import { isBun } from '../utils/is-engine.ts';
import http from 'http';
export const xms2jsParser = async (data: string): Promise<any> => {
  try {
    // 使用xml2js解析XML
    const xml = await xml2js.parseStringPromise(data);
    return xml;
  } catch (error) {
    console.error('XML解析错误:', error);
    return null;
  }
}
export const parseXml = async (req: http.IncomingMessage): Promise<any> => {
  if (isBun) {
    // @ts-ignore
    const body = req.body;
    let xmlString = '';
    if (body) {
      xmlString = body;
    }
    if (!xmlString) {
      // @ts-ignore
      xmlString = await req.bun?.request?.text?.();
    }
    if (xmlString) {
      return await xms2jsParser(xmlString)
    }
    console.error('没有读取到请求体');
    return null;
  }
  return await new Promise((resolve) => {
    // 读取请求数据
    let data = '';
    req.setEncoding('utf8');
    // 监听data事件，接收数据片段
    req.on('data', (chunk) => {
      data += chunk;
    });
    // 当请求结束时处理数据
    req.on('end', () => {
      try {
        xms2jsParser(data).then((result) => {
          resolve(result);
        });
      } catch (error) {
        console.error('处理请求时出错:', error);
        resolve(null);
      }
    });
  });
};
