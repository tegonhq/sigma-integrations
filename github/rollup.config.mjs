/** Copyright (c) 2022, Poozle, all rights reserved. **/

import { babel } from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import resolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import { terser } from 'rollup-plugin-terser';
import typescript from 'rollup-plugin-typescript2';

const frontendPlugins = [
  json(),
  resolve({ extensions: ['.js', '.jsx', '.ts', '.tsx'] }),
  commonjs({
    include: /\/node_modules\//,
  }),
  typescript(),
  babel({
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
    presets: ['@babel/preset-react'],
  }),
  terser(),
  replace({
    'process.env.NODE_ENV': JSON.stringify('production'),
  }),
];

const backendPlugins = [
  json(),
  resolve({ extensions: ['.js', '.ts'] }),
  commonjs({
    include: /\/node_modules\//,
  }),
  typescript(),
  babel({
    extensions: ['.js', '.ts'],
  }),
  terser(),
  replace({
    'process.env.NODE_ENV': JSON.stringify('production'),
  }),
];

// eslint-disable-next-line import/no-anonymous-default-export
export default [
  {
    input: 'frontend/index.tsx',
    external: ['react', 'react-dom', 'react-scripts'],
    output: [
      {
        file: 'dist/frontend/index.js',
        sourcemap: true,
        format: 'cjs',
        exports: 'named',
        preserveModules: false,
      },
    ],
    plugins: frontendPlugins,
  },
  {
    input: 'backend/index.ts',
    external: ['fs', 'path'],
    output: [
      {
        file: 'dist/backend/index.js',
        sourcemap: true,
        format: 'cjs',
        exports: 'named',
        preserveModules: false,
      },
    ],
    plugins: backendPlugins,
  },
];