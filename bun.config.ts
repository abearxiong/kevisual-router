import path from 'node:path';
import pkg from './package.json';
import fs from 'node:fs';
import { execSync } from 'node:child_process';
const w = (p: string) => path.resolve(import.meta.dir, p);

const external: string[] = ["bun"];
await Bun.build({
  target: 'node',
  format: 'esm',
  entrypoints: [w('./agent/main.ts')],
  outdir: w('./dist'),
  naming: {
    entry: 'app.js',
  },
  define: {},
  external
});

const cmd = 'dts -i ./agent/main.ts -o /app.d.ts';

execSync(cmd, { stdio: 'inherit' });

// Copy package.json to dist