// rollup.config.js

import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { dts } from 'rollup-plugin-dts';
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
      resolve(), // 使用 @rollup/plugin-node-resolve 解析 node_modules 中的模块
      // commonjs(),
      typescript(), // 使用 @rollup/plugin-typescript 处理 TypeScript 文件
    ],
    external: ['ws'],
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
];
