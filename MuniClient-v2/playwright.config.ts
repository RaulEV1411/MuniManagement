import { defineConfig, devices } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

// Pruebas de punta a punta: Django real (MuniServer/scripts/servidor_e2e.sh, con SQLite y datos de
// ejemplo) y el front de Vite, que manda /api a Django. Localmente:
//   PYTHON=../.venv/bin/python npm run e2e
// Con el entorno de desarrollo levantado en 8000/5173, se corre en otros puertos:
//   E2E_PUERTO_API=8002 E2E_PUERTO_WEB=5175 PYTHON=../.venv/bin/python npm run e2e
const API = process.env.E2E_PUERTO_API ?? '8000'
const WEB = process.env.E2E_PUERTO_WEB ?? '5173'
// El build servido con `vite preview`, para probar la CSP de producción (e2e/csp.spec.ts).
const PREVIEW = process.env.E2E_PUERTO_PREVIEW ?? '4173'
// La gente usa la aplicación en la zona horaria de la institución, que es la del servidor: el navegador y las
// pruebas, también. Con la de la máquina (UTC en la CI), de 18:00 a 24:00 de Costa Rica «hoy» es mañana, y
// el servidor rechaza esa fecha por futura. Los workers heredan TZ.
const ZONA = process.env.ZONA_HORARIA ?? 'America/Costa_Rica'
process.env.TZ = ZONA
const tmp = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'e2e/.tmp')
const entorno = {
  ...process.env,
  ZONA_HORARIA: ZONA,
  E2E_DB: process.env.E2E_DB ?? path.join(tmp, 'db.sqlite3'),
  E2E_CORREOS: process.env.E2E_CORREOS ?? path.join(tmp, 'correos'),
  VITE_API_URL: '/api/v1',
  VITE_PROXY_API: `http://localhost:${API}`,
  E2E_PUERTO_API: API,
  E2E_PUERTO_PREVIEW: PREVIEW,
  FRONTEND_URL: `http://localhost:${WEB}`,
  // El mapa y la búsqueda de direcciones apuntan a hosts falsos que las fixtures responden: las pruebas no
  // salen a internet (e2e/fixtures/mapa.ts).
  VITE_MAPA_ESTILO: 'https://mapa.e2e.test/estilo.json',
  VITE_BUSQUEDA_DIRECCIONES: 'https://direcciones.e2e.test/search',
  MAPA_ORIGEN: 'https://mapa.e2e.test',
  BUSQUEDA_ORIGEN: 'https://direcciones.e2e.test',
} as Record<string, string>
// Las fixtures (e2e/fixtures) llaman al endpoint de siembra en este puerto; la CSP lee los orígenes del mapa.
Object.assign(process.env, {
  E2E_CORREOS: entorno.E2E_CORREOS, E2E_PUERTO_API: API, MAPA_ORIGEN: entorno.MAPA_ORIGEN, BUSQUEDA_ORIGEN: entorno.BUSQUEDA_ORIGEN,
})

const navegador = { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } }

// Estándar: planning/munimanagement-estandar-pruebas.md. Cada prueba que cambia algo trabaja sobre su
// propio escenario (fixture `escenario`), así que corren en paralelo. Las @global cambian algo que
// comparten todas (configuración, matriz de permisos, aviso de privacidad, catálogos): van al final, de a una.
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  workers: 2,
  // Con dos workers en una Mac de 8 GB (y Docker arriba) cada prueba tarda más que de a una.
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${WEB}`,
    trace: 'retain-on-failure',
    viewport: { width: 1440, height: 900 },
    timezoneId: ZONA,
  },
  projects: [
    { name: 'modulos', grepInvert: /@global|@a11y/, use: navegador },
    // Con movimiento reducido, sonner y framer-motion animan menos: axe mide lo que queda quieto.
    { name: 'a11y', grep: /@a11y/, use: { ...navegador, reducedMotion: 'reduce' } },
    { name: 'global', grep: /@global/, dependencies: ['modulos', 'a11y'], fullyParallel: false, workers: 1, use: navegador },
  ],
  webServer: [
    {
      command: 'bash ../MuniServer/scripts/servidor_e2e.sh',
      url: `http://localhost:${API}/api/v1/health/`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: entorno,
    },
    {
      command: `npx vite --port ${WEB} --strictPort`,
      url: `http://localhost:${WEB}`,
      reuseExistingServer: false,
      timeout: 60_000,
      env: entorno,
    },
    {
      command: `npx vite build --logLevel warn && npx vite preview --port ${PREVIEW} --strictPort`,
      url: `http://localhost:${PREVIEW}`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: entorno,
    },
  ],
})
