import { Command, program } from 'commander';
import { App } from './app.ts';
import { RemoteApp } from '@kevisual/remote-app'
import z from 'zod';
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
        const raw = pair.slice(idx + 1);
        let value: string | number | boolean = raw;
        if (raw === 'true') value = true;
        else if (raw === 'false') value = false;
        else if (raw !== '' && !isNaN(Number(raw))) value = Number(raw);
        result[key] = value as string;
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
export const createCommand = (opts: { app: any, program: Command }) => {
  const { program } = opts;
  const app = opts.app as App;
  const routes = app.routes;


  const groupRoutes = groupByPath(routes);
  for (const path in groupRoutes) {
    const routeList = groupRoutes[path];
    const keys = routeList.map(route => route.key).filter(Boolean);
    const subProgram = program.command(path).description(`路由[${path}] ${keys.length > 0 ? ': ' + keys.join(', ') : ''}`);
    routeList.forEach(route => {
      if (!route.key) return;
      const description = parseDescription(route);
      subProgram.command(route.key)
        .description(description || '')
        .option('--args <args>', '命令参数，支持 JSON 格式或 key=value 形式，例如: --args \'{"a":1}\' 或 --args \'a=1 b=2\'')
        .argument('[args...]', '位置参数（推荐通过 -- 分隔传入），支持 JSON 或 key=value 格式，例如: -- a=1 b=2 或 -- \'{"a":1}\'')
        .action(async (passedArgs: string[], options, _command) => {
          const output = (data: any) => {
            if (typeof data === 'object') {
              process.stdout.write(JSON.stringify(data, null, 2) + '\n');
            } else {
              process.stdout.write(String(data) + '\n');
            }
          }
          try {
            let args: Record<string, any> = {};
            if (options.args) {
              args = parseArgs(options.args);
            } else if (passedArgs.length > 0) {
              args = parseArgs(passedArgs.join(' '));
            }
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

export const parse = async (opts: {
  app: any,
  description?: string,
  parse?: boolean,
  version?: string,
  program?: Command,
  remote?: {
    token?: string,
    username?: string,
    id?: string,
  },
  exitOnEnd?: boolean,
}) => {
  const { description, parse = true, version, exitOnEnd = true } = opts;
  const app = opts.app as App;
  const _program = opts.program || program;
  _program.description(description || 'Router 命令行工具');
  if (version) {
    _program.version(version);
  }
  app.createRouteList();

  createCliList(app);
  createCommand({ app: app as App, program: _program });

  if (opts.remote) {
    const { token, username, id } = opts.remote;
    const remoteApp = new RemoteApp({
      app,
      token,
      username,
      id,
    });
    const isConnect = await remoteApp.isConnect();
    if (isConnect) {
      remoteApp.listenProxy();
      console.log('已连接到远程应用，正在监听命令...');
    }
    return;
  }
  if (parse) {
    await _program.parseAsync(process.argv);
    if (exitOnEnd) {
      process.exit(0);
    }
  }
}

const createCliList = (app: App) => {
  app.route({
    path: 'cli',
    key: 'list',
    description: '列出所有可用的命令',
    metadata: {
      summary: '列出所有可用的命令',
      args: {
        q: z.string().optional().describe('查询关键词，支持模糊匹配命令'),
        path: z.string().optional().describe('按路径前缀过滤，如 user、admin'),
        tags: z.string().optional().describe('按标签过滤，多个标签用逗号分隔'),
        sort: z.enum(['key', 'path', 'name']).optional().describe('排序方式'),
        limit: z.number().optional().describe('限制返回数量'),
        offset: z.number().optional().describe('偏移量，用于分页'),
        format: z.enum(['table', 'simple', 'json']).optional().describe('输出格式'),
      }
    }
  }).define(async (ctx) => {
    const { q, path: pathFilter, tags, sort, limit, offset, format } = ctx.query as any;
    let routes = app.routes.map(route => {
      return {
        path: route.path,
        key: route.key,
        description: route?.metadata?.summary || route.description || '',
        tags: route?.metadata?.tags || [],
      };
    });

    // 路径过滤
    if (pathFilter) {
      routes = routes.filter(route => route.path.startsWith(pathFilter));
    }

    // 标签过滤
    if (tags) {
      const tagList = tags.split(',').map((t: string) => t.trim().toLowerCase()).filter(Boolean);
      if (tagList.length > 0) {
        routes = routes.filter(route => {
          const routeTags = Array.isArray(route.tags) ? route.tags.map((t: unknown) => String(t).toLowerCase()) : [];
          return tagList.some((tag: string) => routeTags.includes(tag));
        });
      }
    }

    // 关键词过滤
    if (q) {
      const keyword = q.toLowerCase();
      routes = routes.filter(route => {
        return route.path.toLowerCase().includes(keyword) ||
          route.key.toLowerCase().includes(keyword) ||
          route.description.toLowerCase().includes(keyword);
      });
    }

    // 排序
    if (sort) {
      routes.sort((a, b) => {
        if (sort === 'path') return a.path.localeCompare(b.path);
        if (sort === 'key') return a.key.localeCompare(b.key);
        return a.key.localeCompare(b.key); // name 默认为 key
      });
    }

    // 分页
    const total = routes.length;
    const start = offset || 0;
    const end = limit ? start + limit : undefined;
    routes = routes.slice(start, end);

    // 输出
    const outputFormat = format || 'table';
    if (outputFormat === 'json') {
      console.log(JSON.stringify({ total, offset: start, limit, routes }, null, 2));
      return;
    }

    if (outputFormat === 'simple') {
      routes.forEach(route => {
        console.log(`${route.path} ${route.key}`);
      });
      return;
    }

    // table 格式
    const table = routes.map(route => {
      return `${route.path} ${route.key} - ${route.description}`;
    }).join('\n');

    console.log(table);
  }).addTo(app, { overwrite: false })
}