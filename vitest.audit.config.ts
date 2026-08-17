import { fileURLToPath } from 'node:url'

import { defineConfig, mergeConfig } from 'vitest/config'
import { createViteConfig } from './vite.config.ts'

export default mergeConfig(
  createViteConfig(false),
  defineConfig({
    test: {
      environment: 'jsdom',
      include: ['src/**/*.audit.ts'],
      root: fileURLToPath(new URL('./', import.meta.url)),
    },
  }),
)
