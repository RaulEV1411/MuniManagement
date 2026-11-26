import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // Globales del navegador que se confunden con variables propias: si falta la variable,
      // TypeScript no avisa porque existen en window (pasó con `status` en el Kanban).
      'no-restricted-globals': ['error', 'status', 'name', 'event', 'origin', 'length', 'top', 'parent', 'self', 'close', 'open', 'closed', 'history', 'location'],
    },
  },
])
