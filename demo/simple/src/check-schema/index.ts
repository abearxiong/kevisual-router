import { createSchema } from '@kevisual/router';

const a = createSchema({
  type: 'string',
  minLength: 1,
  maxLength: 10,
  regex: '^[a-zA-Z0-9_]+$',
  required: false,
});

console.log(a.safeParse('1234567890'));
console.log(a.safeParse('').error);
console.log(a.safeParse(undefined));
console.log(a.safeParse(null).error);
