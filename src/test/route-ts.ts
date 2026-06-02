import { QueryRouterServer } from "@/route.ts";
import z from "zod";
import { tr } from "zod/v4/locales";

const router = new QueryRouterServer()

router.route({
  path: 'test',
  metadata: {
    args: {
      a: z.string(),
    },
    check: true,
  },
}).define(async (ctx) => {
  const argZod = ctx.currentRoute.metadata.args as Record<string, z.ZodTypeAny>;
  const mgZod = z.object(argZod);
  // console.log('argZod', argZod);
  // const argA: string = ctx.args.a;
  // const res = await ctx.safeParseAsync(null, { stop: true });
  // // console.log('argA', argA);
  // if (!res.success) {
  //   console.log('res===', res.error.issues);
  // }
  ctx.body = '1';
}).addTo(router);

const res = await router.run({ path: 'test', payload: { a: 'abc' } });
console.log('res', res);