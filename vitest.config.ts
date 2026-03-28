import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    environment: 'node',
    // Prevent deadlocks by running tests sequentially
    fileParallelism: false,
    poolOptions: {
      threads: {
        singleThread: true,
      }
    }
  },
  plugins: [
    swc.vite({
      module: { type: 'es6' },
    }),
  ],
  resolve: {
    alias: {
      src: '/src',
    },
  },
});
