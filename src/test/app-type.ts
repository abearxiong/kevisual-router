import { App, AppRouteContext } from "@/app.ts";
import { QueryRouterServer, RouteContext } from "@/app.ts";
import z from "zod";
const route: RouteContext<{ customField: string }> = {} as any;
route.customField
const appRoute: AppRouteContext<{ customField: string }> = {} as any;
appRoute.customField
// 示例 1: 使用 App，它会自动使用 AppRouteContext<U> 作为 ctx 类型
const app = new App<{
  customField: string;
}>();
app.context.customField = "customValue"; // 可以在 app.context 中添加自定义字段，这些字段会在 ctx 中可用
app.route({
  path: 'test1',
  metadata: {
    args: {
      name: z.string(),
    },
  },
}).define(async (ctx) => {
  // ctx.app 是 App 类型
  const appName = ctx.app.appId;
  // ctx.customField 来自自定义泛型参数
  const customField: string | undefined = ctx.customField;

  // ctx.req 和 ctx.res 来自 HandleCtx
  const req = ctx.req;
  const res = ctx.res;

  // ctx.args 从 metadata.args 推断
  const name: string = ctx.args.name;
  const name2: string = ctx.query.name;


  ctx.body = `Hello ${name}!`;
});
// 示例 2: 使用 QueryRouterServer，它可以传递自定义的 Context 类型
const router = new QueryRouterServer<{
  routerContextField: number;
}>();
router.context.routerContextField
router.route({
  path: 'router-test',
  metadata: {
    args: {
      value: z.number(),
    }
  },
}).define(async (ctx) => {
  const value: number = ctx.args.value;
  const field: number | undefined = ctx.routerContextField;

  ctx.body = value;
});
// 示例 3: 不带泛型参数的 QueryRouterServer，使用默认的 RouteContext
const defaultRouter = new QueryRouterServer();
defaultRouter.route({
  path: 'default-test',
  metadata: {
    args: {
      id: z.string(),
    }
  },
}).define(async (ctx) => {
  const id: string = ctx.args.id;

  ctx.body = id;
});
export { app, router, defaultRouter };