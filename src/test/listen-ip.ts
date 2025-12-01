// import { Server } from 'node:http';
import { Server } from '../server/server.ts'

const server = new Server({
  path: '/',
  handle: async (data, ctx) => {
    console.log('ctx', ctx.req.url)
    console.log('Received data:', data);

    ctx.res.writeHead(200, { 'Content-Type': 'application/json' });
    return JSON.stringify({ code: 200, message: 'Success', data });
  }
});

server.listen(51015, '0.0.0.0', () => {
  console.log('Server is listening on http://localhost:3000');
});

