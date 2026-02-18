import { z } from "zod";
const extractArgs = (args: any) => {
  if (args && typeof args === 'object' && typeof args.shape === 'object') {
    return args.shape as z.ZodRawShape;
  }
  return args || {};
};

type ZodOverride = (opts: { jsonSchema: any; path: string[]; zodSchema: z.ZodTypeAny }) => void;
/**
 * 剥离第一层schema，转换为JSON Schema，无论是skill还是其他的infer比纯粹的zod object schema更合适，因为它可能包含其他的字段，而不仅仅是schema
 * @param args 
 * @returns 
 */
export const toJSONSchema = (args: any, opts?: { mergeObject?: boolean, override?: ZodOverride }): { [key: string]: any } => {
  const mergeObject = opts?.mergeObject ?? false;
  if (!args) return {};
  const _override = ({ jsonSchema, path, zodSchema }) => {
    if (Array.isArray(path) && path.length > 0) {
      return
    }
    const isOptional = (zodSchema as any).isOptional?.();
    if (isOptional) {
      // 添加自定义属性
      jsonSchema.optional = true;
    }
  }
  const isError = (keys: string[]) => {
    const errorKeys: string[] = ["toJSONSchema", "def", "type", "parse"]
    const hasErrorKeys = errorKeys.every(key => keys.includes(key));
    return hasErrorKeys;
  }
  const override: any = opts?.override || _override;
  if (mergeObject) {
    if (typeof args === 'object' && typeof args.toJSONSchema === 'function') {
      return args.toJSONSchema();
    }
    if (isError(Object.keys(args))) {
      return {};
    }
    // 如果 mergeObject 为 true，直接将整个对象转换为 JSON Schema
    // 先检测是否是一个错误的 schema
    const schema = z.object(args);
    return schema.toJSONSchema();
  }
  // 如果 args 本身是一个 zod object schema，先提取 shape
  args = extractArgs(args);
  let keys = Object.keys(args);
  if (isError(keys)) {
    console.error(`[toJSONSchema error]: 解析到的 schema 可能不正确，包含了zod默认的value的schema. 请检查输入的 schema 是否正确。`);
    args = {};
    keys = [];
  }
  if (mergeObject) {

  }
  let newArgs: { [key: string]: any } = {};
  for (let key of keys) {
    const item = args[key] as z.ZodAny;
    if (item && typeof item === 'object' && typeof item.toJSONSchema === 'function') {
      newArgs[key] = item.toJSONSchema({ override });
    } else {
      newArgs[key] = args[key]; // 可能不是schema
    }
  }
  return newArgs;
}
export const fromJSONSchema = <Merge extends boolean = false>(args: any = {}, opts?: { mergeObject?: boolean }) => {
  let resultArgs: any = null;
  const mergeObject = opts?.mergeObject ?? false;
  if (args["$schema"] || (args.type === 'object' && args.properties && typeof args.properties === 'object')) {
    // 可能是整个schema
    const objectSchema = z.fromJSONSchema(args);
    const extract = extractArgs(objectSchema);
    const keys = Object.keys(extract);
    const newArgs: { [key: string]: any } = {};
    for (let key of keys) {
      newArgs[key] = extract[key];
    }
    resultArgs = newArgs;
  }
  if (!resultArgs) {
    const keys = Object.keys(args);
    const newArgs: { [key: string]: any } = {};
    for (let key of keys) {
      const item = args[key];
      // fromJSONSchema 可能会失败，所以先 optional，等使用的时候再验证
      newArgs[key] = z.fromJSONSchema(item)
      if (item.optional) {
        newArgs[key] = newArgs[key].optional();
      }
    }
    resultArgs = newArgs;
  }
  if (mergeObject) {
    resultArgs = z.object(resultArgs);
  }
  type ResultArgs = Merge extends true ? z.ZodObject<{ [key: string]: any }> : { [key: string]: z.ZodTypeAny };
  return resultArgs as unknown as ResultArgs;
}