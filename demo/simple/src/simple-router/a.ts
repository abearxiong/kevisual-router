import { SimpleRouter } from '@kevisual/router/simple';

const router = new SimpleRouter();

router.get('/', async (req, res) => {
  console.log('get /');
});

router.post('/post', async (req, res) => {
  console.log('post /post');
});

router.get('/user/:id', async (req, res) => {
  console.log('get /user/:id', req.params);
});

router.post('/user/:id', async (req, res) => {
  console.log('post /user/:id', req.params);
});

router.post('/user/:id/a', async (req, res) => {
  console.log('post /user/:id', req.params);
});

router.parse({ url: 'http://localhost:3000/', method: 'GET' } as any, {} as any);
router.parse({ url: 'http://localhost:3000/post', method: 'POST' } as any, {} as any);
router.parse({ url: 'http://localhost:3000/user/1/a', method: 'GET' } as any, {} as any);
router.parse({ url: 'http://localhost:3000/user/1/a', method: 'POST' } as any, {} as any);
