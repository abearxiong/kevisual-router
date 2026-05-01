/** JSON Schema 基本类型映射到 TypeScript 类型 */
type JsonSchemaTypeToTS<T> =
    T extends { type: "string" } ? string :
    T extends { type: "boolean" } ? boolean :
    T extends { type: "number" } ? number :
    T extends { type: "integer" } ? number :
    T extends { type: "object" } ? object :
    T extends { type: "array" } ? any[] :
    any;

/** 将 args shape（key -> JSON Schema 类型）转换为 payload 类型，支持 optional: true 的字段为可选 */
type ArgsShapeToPayload<T> =
    { [K in keyof T as T[K] extends { optional: true } ? never : K]: JsonSchemaTypeToTS<T[K]> } &
    { [K in keyof T as T[K] extends { optional: true } ? K : never]?: JsonSchemaTypeToTS<T[K]> };

/** 处理两种 args 格式：完整 JSON Schema（含 properties）或简单 key->type 映射 */
type ArgsToPayload<T> =
    T extends { type: "object"; properties: infer P }
    ? ArgsShapeToPayload<P>
    : ArgsShapeToPayload<T>;

/** 从 API 定义中提取 metadata.args */
type ExtractArgs<T> =
    T extends { metadata: { args: infer A } } ? A : {};

/** 从 API 定义中提取 metadata.returns */
type ExtractReturns<T> =
    T extends { metadata: { returns: infer R } } ? R : unknown;

/** runAction 第二个参数的类型，根据第一个参数的 metadata.args 推断 */
export type RunActionPayload<T> = ArgsToPayload<ExtractArgs<T>>;

/** runAction 的返回类型，根据 API 定义中的 metadata.returns 推断 data 字段类型 */
export type RunActionReturns<T> = {
    code: number | string;
    data?: unknown extends ExtractReturns<T> ? any : ArgsToPayload<ExtractReturns<T>>;
    message?: string;
    [key: string]: any;
};