import { loadTS, getMatchFiles } from './src/auto/load-ts.ts';
import { listenSocket } from './src/auto/listen-sock.ts';
import { Route, QueryRouter, QueryRouterServer } from './src/route.ts';

export { Route, QueryRouter, QueryRouterServer };

export const App = QueryRouterServer;

export { createSchema } from './src/validator/index.ts';
export type { Rule } from './src/validator/rule.ts';
export type { RouteContext, RouteOpts } from './src/route.ts';

export type { Run } from './src/route.ts';

export { CustomError } from './src/result/error.ts';

export { listenSocket, loadTS, getMatchFiles };

export { autoCall } from './src/auto/call-sock.ts';
