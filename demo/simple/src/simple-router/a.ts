import { SimpleRouter } from '@kevisual/router/src/router-simple.ts';

export const router = new SimpleRouter();

router.get('/', async (req, res) => {
  console.log('get /');
});

router.post('/post', async (req, res) => {
  console.log('post /post');
  console.log('req body:', req, res);
  res.end('post response');
});

router.get('/user/:id', async (req, res) => {
  console.log('get /user/:id', req.params);
  res.end(`user id is ${req.params.id}`);
});

router.post('/user/:id', async (req, res) => {
  console.log('post /user/:id params', req.params);
  const body = await router.getBody(req);
  console.log('post body:', body);
  res.end(`post user id is ${req.params.id}`);
});

router.post('/user/:id/a', async (req, res) => {
  console.log('post /user/:id', req.params);
  res.end(`post user id is ${req.params.id} a`);
});

// router.parse({ url: 'http://localhost:3000/', method: 'GET' } as any, {} as any);
// router.parse({ url: 'http://localhost:3000/post', method: 'POST' } as any, {} as any);
// router.parse({ url: 'http://localhost:3000/user/1/a', method: 'GET' } as any, {} as any);
// router.parse({ url: 'http://localhost:3000/user/1/a', method: 'POST' } as any, {} as any);
