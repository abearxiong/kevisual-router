import { program } from 'commander';
import { App } from './app.ts';

export const groupByPath = (routes: App['routes']) => {
  return routes.reduce((acc, route) => {
    const path = route.path || 'default';
    if (!acc[path]) {
      acc[path] = [];
    }
    acc[path].push(route);
    return acc;
  }, {} as Record<string, typeof routes>);
}
export const parseArgs = (args: string) => {
  try {
    return JSON.parse(args);
  } catch {
    // 尝试解析 a=b b=c 格式
    const result: Record<string, string> = {};
    const pairs = args.match(/(\S+?)=(\S+)/g);
    if (pairs && pairs.length > 0) {
      for (const pair of pairs) {
        const idx = pair.indexOf('=');
        const key = pair.slice(0, idx);
        const value = pair.slice(idx + 1);
        result[key] = value;
      }
      return result;
    }
    throw new Error('Invalid arguments: expected JSON or key=value pairs (e.g. a=b c=d)');
  }
}
export const parseDescription = (route: App['routes'][number]) => {
  let desc = '';
  if (route.metadata?.skill) {
    desc += `\n\t=====${route.metadata.skill}=====\n`;
  }
  let hasSummary = false;
  if (route.metadata?.summary) {
    desc += `\t${route.metadata.summary}`;
    hasSummary = true;
  }
  if (route.metadata?.args) {
    const argsLines = Object.entries(route.metadata.args).map(([key, schema]: [string, any]) => {
      const defType: string = schema?._def?.type ?? schema?.type ?? '';
      const isOptional = defType === 'optional';
      const innerType: string = isOptional
        ? (schema?._def?.innerType?.type ?? schema?._def?.innerType?._def?.type ?? '')
        : defType;
      const description: string =
        schema?.description ??
        schema?._def?.description ??
        '';
      const optionalMark = isOptional ? '?' : '';
      const descPart = description ? `  ${description}` : '';
      return `\t  - ${key}${optionalMark}: ${innerType}${descPart}`;
    });
    desc += '\n\targs:\n' + argsLines.join('\n');
  }
  if (route.description && !hasSummary) {
    desc += `\t - ${route.description}`;
  }
  return desc;
}
export const createCommand = (opts: { app: App, program: typeof program }) => {
  const { app, program } = opts;
  const routes = app.routes;


  const groupRoutes = groupByPath(routes);
  for (const path in groupRoutes) {
    const routeList = groupRoutes[path];
    const keys = routeList.map(route => route.key).filter(Boolean);
    const subProgram = program.command(path).description(`路由《${path}》 ${keys.length > 0 ? ': ' + keys.join(', ') : ''}`);
    routeList.forEach(route => {
      if (!route.key) return;
      const description = parseDescription(route);
      subProgram.command(route.key)
        .description(description || '')
        .option('--args <args>', 'JSON字符串参数，传递给命令执行')
        .action(async (options) => {
          const output = (data: any) => {
            if (typeof data === 'object') {
              process.stdout.write(JSON.stringify(data, null, 2) + '\n');
            } else {
              process.stdout.write(String(data) + '\n');
            }
          }
          try {
            const args = options.args ? parseArgs(options.args) : {};
            // 这里可以添加实际的命令执行逻辑，例如调用对应的路由处理函数
            const res = await app.run({ path, key: route.key, payload: args }, { appId: app.appId });
            if (res.code === 200) {
              output(res.data);
            } else {
              output(`Error: ${res.message}`);
            }
          } catch (error) {
            output(`Execution error: ${error instanceof Error ? error.message : String(error)}`);
          }
        });
    });
  }
}

program.parse(process.argv);

export const parse = (opts: { app: App, description?: string, parse?: boolean }) => {
  const { app, description, parse } = opts;
  program.description(description || 'Router 命令行工具');
  createCommand({ app: app as App, program });
  if (parse) {
    program.parse(process.argv);
  }
}