import { defineConfig } from 'vitest/config'
import path from 'path'

// Pruebas unitarias de la lógica pura del front (src/**/*.test.ts). Las de punta a punta están en e2e/.
export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
