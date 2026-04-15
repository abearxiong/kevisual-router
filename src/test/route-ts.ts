import { QueryRouterServer } from "@/route.ts";
import z from "zod";

const router = new QueryRouterServer()

router.route({
  metadata: {
    args: {
      a: z.string(),
    }
  },
}).define(async (ctx) => {
  const argA: string = ctx.args.a;
  ctx.body = '1';
}).addTo(router);