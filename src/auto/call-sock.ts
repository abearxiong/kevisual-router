import { createConnection } from 'node:net';

type QueryData = {
  path?: string;
  key?: string;
  payload?: any;
  [key: string]: any;
};

type CallSockOptions = {
  socketPath?: string;
  timeout?: number;
  method?: 'GET' | 'POST';
};

export const callSock = async (data: QueryData, options: CallSockOptions = {}): Promise<any> => {
  const { socketPath = './app.sock', timeout = 10000, method = 'POST' } = options;

  return new Promise((resolve, reject) => {
    const client = createConnection(socketPath);
    let responseData = '';
    let timer: NodeJS.Timeout;

    // 设置超时
    if (timeout > 0) {
      timer = setTimeout(() => {
        client.destroy();
        reject(new Error(`Socket call timeout after ${timeout}ms`));
      }, timeout);
    }

    client.on('connect', () => {
      try {
        let request: string;

        if (method === 'GET') {
          // GET 请求：参数放在 URL 中
          const searchParams = new URLSearchParams();
          Object.entries(data).forEach(([key, value]) => {
            if (key === 'payload' && typeof value === 'object') {
              searchParams.append(key, JSON.stringify(value));
            } else {
              searchParams.append(key, String(value));
            }
          });

          const queryString = searchParams.toString();
          const url = queryString ? `/?${queryString}` : '/';

          request = [`GET ${url} HTTP/1.1`, 'Host: localhost', 'Connection: close', '', ''].join('\r\n');
        } else {
          // POST 请求：数据放在 body 中
          const body = JSON.stringify(data);
          const contentLength = Buffer.byteLength(body, 'utf8');

          request = [
            'POST / HTTP/1.1',
            'Host: localhost',
            'Content-Type: application/json',
            `Content-Length: ${contentLength}`,
            'Connection: close',
            '',
            body,
          ].join('\r\n');
        }

        client.write(request);
      } catch (error) {
        if (timer) clearTimeout(timer);
        client.destroy();
        reject(error);
      }
    });

    client.on('data', (chunk) => {
      responseData += chunk.toString();
      
      // 检查是否收到完整的HTTP响应
      if (responseData.includes('\r\n\r\n')) {
        const [headerSection] = responseData.split('\r\n\r\n');
        const contentLengthMatch = headerSection.match(/content-length:\s*(\d+)/i);
        
        if (contentLengthMatch) {
          const expectedLength = parseInt(contentLengthMatch[1]);
          const bodyStart = responseData.indexOf('\r\n\r\n') + 4;
          const currentBodyLength = Buffer.byteLength(responseData.slice(bodyStart), 'utf8');
          
          // 如果收到了完整的响应，主动关闭连接
          if (currentBodyLength >= expectedLength) {
            client.end();
          }
        } else if (responseData.includes('\r\n0\r\n\r\n')) {
          // 检查 chunked 编码结束标记
          client.end();
        }
      }
    });

    client.on('end', () => {
      if (timer) clearTimeout(timer);

      try {
        // 解析 HTTP 响应
        const response = parseHttpResponse(responseData);

        if (response.statusCode >= 400) {
          reject(new Error(`HTTP ${response.statusCode}: ${response.body}`));
          return;
        }

        // 尝试解析 JSON 响应
        try {
          const result = JSON.parse(response.body);
          resolve(result);
        } catch {
          // 如果不是 JSON，直接返回文本
          resolve(response.body);
        }
      } catch (error) {
        reject(error);
      }
    });

    client.on('error', (error) => {
      if (timer) clearTimeout(timer);
      reject(error);
    });

    client.on('timeout', () => {
      if (timer) clearTimeout(timer);
      client.destroy();
      reject(new Error('Socket connection timeout'));
    });
  });
};

// 解析 HTTP 响应的辅助函数
function parseHttpResponse(responseData: string) {
  const [headerSection, ...bodyParts] = responseData.split('\r\n\r\n');
  const body = bodyParts.join('\r\n\r\n');

  const lines = headerSection.split('\r\n');
  const statusLine = lines[0];
  const statusMatch = statusLine.match(/HTTP\/\d\.\d (\d+)/);
  const statusCode = statusMatch ? parseInt(statusMatch[1]) : 200;

  const headers: Record<string, string> = {};
  for (let i = 1; i < lines.length; i++) {
    const [key, ...valueParts] = lines[i].split(':');
    if (key && valueParts.length > 0) {
      headers[key.trim().toLowerCase()] = valueParts.join(':').trim();
    }
  }

  return {
    statusCode,
    headers,
    body: body || '',
  };
}

export const autoCall = (data: QueryData, options?: Omit<CallSockOptions, 'method'>) => {
  return callSock(data, { ...options, method: 'POST' });
};
