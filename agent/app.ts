import { App } from '../src/app.ts';
import { useContextKey } from '@kevisual/context';
export const app = useContextKey<App>('app', () => new App());

export { createSkill, type Skill, tool } from '../src/app.ts';