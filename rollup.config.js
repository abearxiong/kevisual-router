// rollup.config.js

import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { dts } from 'rollup-plugin-dts';
import alias from '@rollup/plugin-alias';

const createAlias = () => {
  return alias({
    entries: [
      { find: 'http', replacement: 'node:http' },
      { find: 'https', replacement: 'node:https' },
      { find: 'fs', replacement: 'node:fs' },
      { find: 'path', replacement: 'node:path' },
      { find: 'crypto', replacement: 'node:crypto' },
      { find: 'zlib', replacement: 'node:zlib' },
      { find: 'stream', replacement: 'node:stream' },
      { find: 'net', replacement: 'node:net' },
      { find: 'tty', replacement: 'node:tty' },
      { find: 'tls', replacement: 'node:tls' },
      { find: 'buffer', replacement: 'node:buffer' },
      { find: 'timers', replacement: 'node:timers' },
      // { find: 'string_decoder', replacement: 'node:string_decoder' },
      { find: 'dns', replacement: 'node:dns' },
      { find: 'domain', replacement: 'node:domain' },
      { find: 'os', replacement: 'node:os' },
      { find: 'events', replacement: 'node:events' },
      { find: 'url', replacement: 'node:url' },
      { find: 'assert', replacement: 'node:assert' },
      { find: 'util', replacement: 'node:util' },
    ],
  });
};
/**
 * @type {import('rollup').RollupOptions}
 */
export default [
  {
    input: 'src/index.ts', // TypeScript 入口文件
    output: {
      file: 'dist/router.js', // 输出文件
      format: 'es', // 输出格式设置为 ES 模块
    },
    plugins: [
      createAlias(),
      resolve({
        browser: false,
      }), // 使用 @rollup/plugin-node-resolve 解析 node_modules 中的模块
      commonjs(),
      typescript(), // 使用 @rollup/plugin-typescript 处理 TypeScript 文件
    ],
  },
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/router.d.ts',
      format: 'es',
    },
    plugins: [dts()],
  },
  {
    input: 'src/browser.ts',
    output: {
      file: 'dist/router-browser.js',
      format: 'es',
    },
    plugins: [
      resolve({
        browser: true,
      }),
      commonjs(),
      typescript(),
    ],
  },
  {
    input: 'src/browser.ts',
    output: {
      file: 'dist/router-browser.d.ts',
      format: 'es',
    },
    plugins: [dts()],
  },
  {
    input: 'src/sign.ts',
    output: {
      file: 'dist/router-sign.js',
      format: 'es',
    },
    plugins: [
      createAlias(),
      resolve({
        browser: false,
      }),
      commonjs(),
      typescript(),
    ],
  },
  {
    input: 'src/sign.ts',
    output: {
      file: 'dist/router-sign.d.ts',
      format: 'es',
    },
    plugins: [dts()],
  },
  {
    input: 'src/router-define.ts',
    output: {
      file: 'dist/router-define.js',
      format: 'es',
    },
    plugins: [
      resolve({
        browser: true,
      }),
      commonjs(),
      typescript(),
    ],
  },
  {
    input: 'src/router-define.ts',
    output: {
      file: 'dist/router-define.d.ts',
      format: 'es',
    },
    plugins: [dts()],
  },
  {
    input: 'src/router-simple.ts',
    output: {
      file: 'dist/router-simple.js',
      format: 'es',
    },
    plugins: [
      resolve({
        browser: false,
      }),
      commonjs(),
      typescript(),
    ],
  },
  {
    input: 'src/router-simple.ts',
    output: {
      file: 'dist/router-simple.d.ts',
      format: 'es',
    },
    plugins: [dts()],
  },
  {
    input: 'src/router-simple-lib.ts',
    output: {
      file: 'dist/router-simple-lib.js',
      format: 'es',
    },
    plugins: [
      resolve({
        browser: false,
      }),
      commonjs(),
      typescript(),
    ],
    external: ['xml2js'],
  },
  {
    input: 'src/router-simple-lib.ts',
    output: {
      file: 'dist/router-simple-lib.d.ts',
      format: 'es',
    },
    plugins: [dts()],
  },
];
