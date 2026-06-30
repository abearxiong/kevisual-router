/**
 * Decorator-based route definitions for @kevisual/router.
 *
 * Usage:
 * ```ts
 * import { Mini } from "../route.ts";
 * import { parse } from '../commander.ts';
 * import { Controller, Route } from './decorators/index.ts';
 *
 * const app = new Mini();
 *
 * @Controller()
 * class TestController {
 *   @Route({ path: 'main', rid: 'abc', description: '这是一个测试的 main 路由' })
 *   async mainRoute(ctx: any) {
 *     ctx.body = { a: '123' };
 *   }
 *
 *   @Route({ path: 'good', description: '这是一个测试的 good 路由' })
 *   async goodRoute(ctx: any) {
 *     ctx.body = { content: 'good' };
 *   }
 * }
 *
 * app.registerControllers([TestController]);
 * await parse({ app });
 * ```
 */

import type { RouteOpts } from '../route.ts';

/**
 * WeakMap storing route opts by prototype for the registerControllers function.
 */
const controllerRoutes = new WeakMap<object, RouteOpts[]>();

/**
 * Decorator that marks a class as a controller.
 * Routes defined with @Route inside this class will be registered
 * when passed to `app.registerControllers()`.
 */
export function Controller(): ClassDecorator {
  return (target: any) => {
    if (!controllerRoutes.has(target)) {
      controllerRoutes.set(target.prototype, []);
    }
  };
}

/**
 * Decorator that marks a method as a route handler.
 *
 * @param opts - Route options (path, rid, description, middleware, etc.)
 */
export function Route(opts: RouteOpts): MethodDecorator {
  return (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    // Store on prototype for the registerControllers method to discover
    descriptor.value.__route_opts = opts;

    // Also store in WeakMap for the direct registerControllers() function
    const routes = controllerRoutes.get(target) || [];
    const existing = routes.findIndex((r) => r.key === (opts.key ?? propertyKey.toString()));
    if (existing !== -1) routes.splice(existing, 1);
    routes.push({
      ...opts,
      key: opts.key ?? propertyKey.toString(),
      run: descriptor.value,
    });
    controllerRoutes.set(target, routes);
  };
}

/**
 * Register controller classes onto a QueryRouterServer / Mini app.
 * Iterates over the controllers, finds all @Route-annotated methods,
 * and adds them to the router.
 *
 * @param app - The router instance (typically Mini or App)
 * @param controllers - Array of controller classes
 */
export function registerControllers(
  app: { registerControllers(controllers: (new (...args: any[]) => any)[]): void },
  controllers: (new (...args: any[]) => any)[],
) {
  app.registerControllers(controllers);
}
