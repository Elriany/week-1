import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    projects: [
      {
        test: {
          name: 'unit',
          include: ['src/**/*.spec.ts'],
          // setupFiles must be declared per project — a value on the root `test`
          // block does not propagate into projects.
          setupFiles: ['./src/__tests__/setup.ts'],
          environment: 'node',
          globals: true,
        },
      },
      {
        test: {
          name: 'integration',
          include: ['src/**/*.itest.ts'],
          setupFiles: ['./src/__tests__/setup.ts'],
          environment: 'node',
          globals: true,
          fileParallelism: false,
          testTimeout: 30_000,
        },
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['src/**/*.spec.ts', 'src/**/*.itest.ts', 'src/database/migrations/**', 'src/server.ts'],
    },
  },
})
