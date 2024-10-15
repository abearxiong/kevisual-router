import { z, ZodError, Schema } from 'zod';
export { Schema };
type BaseRule = {
  value?: any;
  required?: boolean;
  message?: string;
};

type RuleString = {
  type: 'string';
  minLength?: number;
  maxLength?: number;
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
  minItems?: number;
  maxItems?: number;
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
      if (rule.minLength) stringSchema = stringSchema.min(rule.minLength, `String must be at least ${rule.minLength} characters long.`);
      if (rule.maxLength) stringSchema = stringSchema.max(rule.maxLength, `String must not exceed ${rule.maxLength} characters.`);
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
export const createSchema = (rule: Rule): Schema => {
  try {
    rule.required = rule.required || false;
    if (!rule.required) {
      return schemaFormRule(rule).nullable();
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
