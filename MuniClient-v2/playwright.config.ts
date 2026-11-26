import { defineConfig, devices } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

// Pruebas de punta a punta: Django real (MuniServer/scripts/servidor_e2e.sh, con SQLite y datos de
// ejemplo) y el front de Vite, que manda /api a Django. Localmente:
//   PYTHON=../.venv/bin/python npm run e2e
const tmp = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'e2e/.tmp')
const entorno = {
  ...process.env,
  E2E_DB: process.env.E2E_DB ?? path.join(tmp, 'db.sqlite3'),
  E2E_CORREOS: process.env.E2E_CORREOS ?? path.join(tmp, 'correos'),
  VITE_API_URL: '/api/v1',
} as Record<string, string>
Object.assign(process.env, { E2E_CORREOS: entorno.E2E_CORREOS })

export default defineConfig({
  testDir: 'e2e',
  // Comparten una base: en serie y en un solo proceso.
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    viewport: { width: 1440, height: 900 },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } }],
  webServer: [
    {
      command: 'bash ../MuniServer/scripts/servidor_e2e.sh',
      url: 'http://localhost:8000/api/v1/health/',
      reuseExistingServer: false,
      timeout: 120_000,
      env: entorno,
    },
    {
      command: 'npx vite --port 5173 --strictPort',
      url: 'http://localhost:5173',
      reuseExistingServer: false,
      timeout: 60_000,
      env: entorno,
    },
  ],
})
