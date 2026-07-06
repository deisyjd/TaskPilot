import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['tests/unit/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        extends: true,
        test: {
          name: 'functional',
          include: ['tests/functional/**/*.test.ts'],
          environment: 'node',
          globalSetup: ['./tests/functional/global-setup.ts'],
          // Las suites comparten la misma base de datos: en serie para
          // que el cambio de empresa activa de una no interfiera con otra.
          fileParallelism: false,
          testTimeout: 15000,
        },
      },
    ],
  },
})
