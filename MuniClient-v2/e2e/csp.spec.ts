import { readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { expect, test, type Page } from '@playwright/test'
import { CLAVE, ANA } from './ayuda'

// La CSP de producción vive en el Caddyfile y Vite en desarrollo no la aplica: acá se sirve el build
// (vite preview) con esa misma cabecera y se recorren las pantallas buscando violaciones.
const raiz = path.dirname(fileURLToPath(import.meta.url))
const CSP = readFileSync(path.join(raiz, '..', 'Caddyfile'), 'utf8').match(/Content-Security-Policy "([^"]+)"/)![1]
const BASE = `http://localhost:${process.env.E2E_PUERTO_PREVIEW ?? '4173'}`

async function conCsp(page: Page) {
  await page.route('**/*', async route => {
    const r = await route.fetch()
    const html = (r.headers()['content-type'] ?? '').includes('text/html')
    await route.fulfill({ response: r, headers: html ? { ...r.headers(), 'content-security-policy': CSP } : r.headers() })
  })
  await page.addInitScript(() => {
    (window as unknown as { __violaciones: string[] }).__violaciones = []
    document.addEventListener('securitypolicyviolation', e =>
      (window as unknown as { __violaciones: string[] }).__violaciones.push(`${e.violatedDirective} ${e.blockedURI}`))
  })
  const errores: string[] = []
  page.on('pageerror', e => errores.push(e.message))
  page.on('console', m => { if (m.type() === 'error') errores.push(m.text()) })
  return errores
}

const violaciones = (page: Page) => page.evaluate(() => (window as unknown as { __violaciones: string[] }).__violaciones)

test('el build no viola la CSP de producción', async ({ page }) => {
  test.setTimeout(60_000)
  const errores = await conCsp(page)
  await page.goto(`${BASE}/publico`)
  await expect(page.getByRole('heading', { name: 'Portal de proyectos' })).toBeVisible()
  expect(await violaciones(page), 'portal').toEqual([])

  await page.goto(`${BASE}/login`)
  await page.fill('input[type=email]', ANA)
  await page.fill('input[type=password]', CLAVE)
  await page.click('button[type=submit]')
  await page.waitForURL('**/dashboard')
  await page.getByRole('link', { name: 'Acera central' }).first().click()
  await page.getByRole('button', { name: 'Editar proyecto' }).click()
  await expect(page.getByRole('dialog', { name: 'Editar proyecto' })).toBeVisible()
  expect(await violaciones(page), 'app').toEqual([])
  // Inter se sirve desde el propio sitio (font-src 'self').
  expect(await page.evaluate(() => document.fonts.check('16px "Inter Variable"', 'Proyecto'))).toBe(true)
  expect(errores, 'errores en la consola').toEqual([])

  // Control: la cabecera de verdad se aplica (si no, todo lo anterior pasaría igual).
  await page.evaluate(() => { const s = document.createElement('script'); s.textContent = 'window.__x = 1'; document.body.appendChild(s) })
  await expect.poll(async () => (await violaciones(page)).some(v => v.startsWith('script-src'))).toBe(true)
})
