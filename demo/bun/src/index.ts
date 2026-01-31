const server = Bun.serve({
  port: 5002,
  fetch(request: Bun.BunRequest, server) {
    const url = new URL(request.url);

    if (url.pathname === '/stream') {
      // 直接使用 Bun 的原生 ReadableStream
      const readable = new ReadableStream({
        async start(controller) {
          for (let i = 1; i <= 10; i++) {
            // 检查客户端是否断开
            if (request.signal.aborted) {
              console.log('客户端已断开');
              controller.close();
              return;
            }

            controller.enqueue(`${new Date().toISOString()} 第 ${i} 批数据\n`);
            await new Promise(r => setTimeout(r, 100)); // 模拟延迟
          }
          controller.close();
        }
      });
      request.signal.addEventListener('abort', () => {
        console.log('Request aborted by client');
      });
      return new Response(readable, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain',
          'Transfer-Encoding': 'chunked'
        }
      });
    }

    return new Response('Not Found', { status: 404 });
  }
});
