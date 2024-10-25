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
      return ctx;
    },
    validator: {
      id: {
        type: 'number',
        required: true,
        message: 'id is required',
      },
      data: {
        // @ts-ignore
        type: 'object',
        message: 'data query is error',
        properties: {
          name: {
            type: 'string',
            required: true,
            message: 'name is required',
          },
          age: {
            type: 'number',
            required: true,
            message: 'age is error',
          },
          friends: {
            type: 'object',
            properties: {
              hair: {
                type: 'string',
                required: true,
                message: 'hair is required',
              },
            },
          },
        },
      },
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
      age: 's'+13,
      friends: {
        hair: 'black',
        messages: 'hello',
      },
    },
  } as any);
  console.log('test===', res);
};
main();
