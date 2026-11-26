import { expect, test } from '@playwright/test'
import { BETO, CLAVE, entrar, ultimoEnlaceDeAcceso } from './ayuda'

const API = `http://localhost:${process.env.E2E_PUERTO_WEB ?? '5173'}/api/v1`

test('login con cookies HttpOnly que JavaScript no ve', async ({ page, context }) => {
  await entrar(page)
  const visibles = await page.evaluate(() => document.cookie)
  expect(visibles).not.toContain('muni_access')
  expect(visibles).not.toContain('muni_refresh')
  const cookies = await context.cookies([API, `${API}/users/`])
  const access = cookies.find(c => c.name === 'muni_access')
  const refresh = cookies.find(c => c.name === 'muni_refresh')
  expect(access?.httpOnly && refresh?.httpOnly).toBe(true)
  expect(access?.sameSite).toBe('Lax')
  expect(refresh?.path).toBe('/api/v1/users/')
})

test('las escrituras sin token CSRF se rechazan', async ({ page }) => {
  await entrar(page)
  const status = await page.evaluate(async () => (await fetch('/api/v1/departments/direcciones/', {
    method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Ataque' }),
  })).status)
  expect(status).toBe(403)
})

test('recargar mantiene la sesión y el access vencido se renueva solo', async ({ page }) => {
  await entrar(page)
  await page.reload()
  await expect(page).toHaveURL(/\/dashboard$/)
  // El access dura 10 s en las pruebas (E2E_ACCESS_SEGUNDOS).
  await page.waitForTimeout(11_000)
  const renovacion = page.waitForResponse(r => r.url().includes('/users/token/refresh/'))
  await page.goto('/users')
  expect((await renovacion).status()).toBe(200)
  await expect(page).toHaveURL(/\/users$/)
})

test('cerrar sesión borra las cookies y revoca el refresh', async ({ page, context }) => {
  await entrar(page)
  const refresh = (await context.cookies(`${API}/users/`)).find(c => c.name === 'muni_refresh')?.value
  expect(refresh).toBeTruthy()
  await page.getByRole('button', { name: /cerrar sesión/i }).first().click()
  await page.waitForURL('**/login')
  expect((await context.cookies([API, `${API}/users/`])).filter(c => c.name.startsWith('muni_'))).toHaveLength(0)
  const reuso = await page.request.post(`${API}/users/token/refresh/`, { data: { refresh } })
  expect(reuso.status()).toBe(401)
  await page.goto('/dashboard')
  await page.waitForURL('**/login')
})

test('recuperar la contraseña con el enlace del correo', async ({ page }) => {
  await page.goto('/login')
  await page.getByText('¿Olvidó su contraseña?').click()
  await page.fill('#olvide-email', BETO)
  await page.click('button[type=submit]')
  await expect(page.getByRole('status')).toContainText('Si el correo está registrado')
  await page.goto(ultimoEnlaceDeAcceso())
  await page.fill('#clave-nueva', 'Palmeras-Cafe-2026')
  await page.fill('#clave-repetida', 'Palmeras-Cafe-2026')
  await page.click('button[type=submit]')
  await page.waitForURL('**/login')
  await entrar(page, BETO, 'Palmeras-Cafe-2026')
  // La anterior ya no sirve.
  await page.getByRole('button', { name: /cerrar sesión/i }).first().click()
  await page.waitForURL('**/login')
  await page.fill('input[type=email]', BETO)
  await page.fill('input[type=password]', CLAVE)
  await page.click('button[type=submit]')
  await expect(page.getByText('Correo o contraseña incorrectos.')).toBeVisible()
})
