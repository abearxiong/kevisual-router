import { App } from '@kevisual/router/src/app.ts';

import { router } from './a.ts';

export const app = new App();

app.server.on([{
  fun: async (req, res) => {
    console.log('Received request:', req.method, req.url);
    const p = await router.parse(req, res);
    if (p) {
      console.log('Router parse result:', p);
    }
  }
}, {
  id: 'abc',
  path: '/ws',
  io: true,
  fun: async (data, end) => {
    console.log('Custom middleware for /ws');
    console.log('Data received:', data);
    end({ message: 'Hello from /ws middleware' });
  }
}]);

app.server.listen(3004, () => {
  console.log('Server is running on http://localhost:3004');

  // fetch('http://localhost:3004/', { method: 'GET' }).then(async (res) => {
  //   const text = await res.text();
  //   console.log('Response for GET /:', text);
  // });

  // fetch('http://localhost:3004/post', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ message: 'Hello, server!' }),
  // }).then(async (res) => {
  //   const text = await res.text();
  //   console.log('Response for POST /post:', text);
  // });

  // fetch('http://localhost:3004/user/123', { method: 'GET' }).then(async (res) => {
  //   const text = await res.text();
  //   console.log('Response for GET /user/123:', text);
  // });

  fetch('http://localhost:3004/user/456', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'User456' }),
  }).then(async (res) => {
    const text = await res.text();
    console.log('Response for POST /user/456:', text);
  });
});