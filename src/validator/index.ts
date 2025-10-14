import { z } from 'zod';
export { schemaFormRule, createSchema, createSchemaList } from './rule.ts';

export type { Rule } from './rule.ts';

export type Schema = z.ZodType<any, any, any>;
