import { z, ZodError } from 'zod';
type BaseRule = {
  value?: any;
  required?: boolean;
  message?: string;
};

type RuleString = {
  type: 'string';
  min?: number;
  max?: number;
  regex?: string;
} & BaseRule;

type RuleNumber = {
  type: 'number';
  min?: number;
  max?: number;
} & BaseRule;

type RuleBoolean = {
  type: 'boolean';
} & BaseRule;

type RuleArray = {
  type: 'array';
  items: Rule;
} & BaseRule;

type RuleObject = {
  type: 'object';
  properties: { [key: string]: Rule };
} & BaseRule;

type RuleAny = {
  type: 'any';
} & BaseRule;

export type Rule = RuleString | RuleNumber | RuleBoolean | RuleArray | RuleObject | RuleAny;

export const schemaFormRule = (rule: Rule): z.ZodType<any, any, any> => {
  switch (rule.type) {
    case 'string':
      let stringSchema = z.string();
      if (rule.min) stringSchema = stringSchema.min(rule.min, `String must be at least ${rule.min} characters long.`);
      if (rule.max) stringSchema = stringSchema.max(rule.max, `String must not exceed ${rule.max} characters.`);
      if (rule.regex) stringSchema = stringSchema.regex(new RegExp(rule.regex), 'Invalid format');
      return stringSchema;
    case 'number':
      let numberSchema = z.number();
      if (rule.min) numberSchema = numberSchema.min(rule.min, `Number must be at least ${rule.min}.`);
      if (rule.max) numberSchema = numberSchema.max(rule.max, `Number must not exceed ${rule.max}.`);
      return numberSchema;
    case 'boolean':
      return z.boolean();
    case 'array':
      return z.array(createSchema(rule.items));
    case 'object':
      return z.object(Object.fromEntries(Object.entries(rule.properties).map(([key, value]) => [key, createSchema(value)])));
    case 'any':
      return z.any();
    default:
      throw new Error(`Unknown rule type: ${(rule as any)?.type}`);
  }
};
export const createSchema = (rule: Rule): z.ZodType<any, any, any> => {
  try {
    rule.required = rule.required ?? false;
    if (!rule.required) {
      // nullable is null
      // nullish is null or undefined
      // optional is undefined
      return schemaFormRule(rule).optional();
    }
    return schemaFormRule(rule);
  } catch (e) {
    if (e instanceof ZodError) {
      console.error(e.format());
    }
    throw e;
  }
};

export const createSchemaList = (rules: Rule[]) => {
  try {
    return rules.map((rule) => createSchema(rule));
  } catch (e) {
    if (e instanceof ZodError) {
      console.error(e.format());
    }
  }
};
