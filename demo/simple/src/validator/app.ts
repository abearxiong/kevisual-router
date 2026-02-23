import { Route, QueryRouter, RouteContext } from '@kevisual/router';
const qr = new QueryRouter();

qr.add(
  new Route('project', 'getList', {
    description: 'get project list',
    run: async (ctx) => {
      ctx!.body = 'project list';
      return ctx;
    },
  }),
);

qr.add(
  new Route('project', 'getDetail', {
    description: 'get project detail',
    run: async (ctx) => {
      ctx!.body = 'project detail';
      return ctx;
    },
  }),
);

qr.add(
  new Route('project', 'getDetail2', {
    description: 'get project detail2',
    run: async (ctx: RouteContext) => {
      ctx!.body = 'project detail2';
    },
  }),
);

const main = async () => {
  // 调用要测试的函数
  const res = await qr.parse({
    path: 'project',
    key: 'getDetail2',
    id: 4,
    data: {
      name: 'john',
      age: 's' + 13,
      friends: {
        hair: 'black',
        messages: 'hello',
      },
    },
  } as any);
  console.log('test===', res);
};
main();
