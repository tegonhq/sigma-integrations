/** Copyright (c) 2022, Poozle, all rights reserved. **/

import { babel } from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import { terser } from 'rollup-plugin-terser';
import typescript from 'rollup-plugin-typescript2';

const frontendPlugins = [
  resolve({ extensions: ['.js', '.jsx', '.ts', '.tsx'] }),
  commonjs({
    include: /\/node_modules\//,
  }),
  typescript(),
  babel({
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
    presets: ['@babel/preset-env', '@babel/preset-react', '@babel/preset-typescript'],
  }),
  terser(),
  replace({
    'process.env.NODE_ENV': JSON.stringify('production'),
  }),
];

const backendPlugins = [
  resolve({ extensions: ['.js', '.ts'] }),
  commonjs({
    include: /\/node_modules\//,
  }),
  typescript(),
  babel({
    extensions: ['.js', '.ts'],
    presets: [['@babel/preset-env', { targets: { node: 20 } }], '@babel/preset-typescript'],
    plugins: ['@babel/plugin-transform-runtime'],
    babelHelpers: 'runtime', // Use runtime mode
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
