import xml2js from 'xml2js';

export const parseXml = async (req: any): Promise<any> => {
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
        // 使用xml2js解析XML
        xml2js.parseString(data, function (err, result) {
          if (err) {
            console.error('XML解析错误:', err);
            resolve(null);
          } else {
            const jsonString = JSON.stringify(result);
            resolve(jsonString);
          }
        });
      } catch (error) {
        console.error('处理请求时出错:', error);
        resolve(null);
      }
    });
  });
};
