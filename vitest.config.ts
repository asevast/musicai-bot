import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.ts'],
    testTimeout: 10000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
  resolve: {
    alias: {
      '@musicai/database': resolve(__dirname, 'packages/database/src'),
      '@musicai/config': resolve(__dirname, 'packages/config/src'),
      '@musicai/shared-types': resolve(__dirname, 'packages/shared-types/src'),
      '@musicai/queues': resolve(__dirname, 'packages/queues/src'),
      '@musicai/vertex-ai': resolve(__dirname, 'packages/vertex-ai/src'),
    },
  },
});
