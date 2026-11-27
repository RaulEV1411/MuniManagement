import { CLAVE, entrar, expect, test, ultimoEnlaceDeAcceso } from '../fixtures'

const API = `http://localhost:${process.env.E2E_PUERTO_WEB ?? '5173'}/api/v1`

test('login con cookies HttpOnly que JavaScript no ve', { tag: ['@lectura', '@critico'] }, async ({ page, context }) => {
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

test('las escrituras sin token CSRF se rechazan', { tag: '@lectura' }, async ({ page }) => {
  await entrar(page)
  const status = await page.evaluate(async () => (await fetch('/api/v1/departments/direcciones/', {
    method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Ataque' }),
  })).status)
  expect(status).toBe(403)
})

test('recargar mantiene la sesión y sin access se renueva solo', { tag: '@lectura' }, async ({ page, context }) => {
  await entrar(page)
  await page.reload()
  await expect(page).toHaveURL(/\/dashboard$/)
  // Sin la cookie del access (como cuando vence; el vencimiento en sí lo prueba Users/tests.py), el
  // primer pedido da 401 y la app renueva con el refresh.
  await context.clearCookies({ name: 'muni_access' })
  const renovacion = page.waitForResponse(r => r.url().includes('/users/token/refresh/'))
  await page.goto('/users')
  expect((await renovacion).status()).toBe(200)
  await expect(page).toHaveURL(/\/users$/)
})

test('si la respuesta de una renovación no llega, la sesión sigue', { tag: '@lectura' }, async ({ page, context, request }) => {
  await entrar(page)
  // Se renueva por fuera del navegador, que se queda con el refresh anterior: es lo que pasa al recargar
  // en medio de una renovación o cuando dos pestañas renuevan a la vez.
  const refresh = (await context.cookies(`${API}/users/`)).find(c => c.name === 'muni_refresh')!.value
  expect((await request.post(`${API}/users/token/refresh/`, { data: { refresh } })).status()).toBe(200)
  await context.clearCookies({ name: 'muni_access' })
  const renovacion = page.waitForResponse(r => r.url().includes('/users/token/refresh/'))
  await page.goto('/users')
  expect((await renovacion).status()).toBe(200)
  await expect(page).toHaveURL(/\/users$/)
})

test('cerrar sesión borra las cookies y revoca el refresh', { tag: '@muta' }, async ({ page, context, escenarioConPersona }) => {
  // Con una persona propia: cerrar la sesión de Ana no debe tocar a las otras pruebas.
  await entrar(page, escenarioConPersona.persona!.email)
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

test('recuperar la contraseña con el enlace del correo', { tag: ['@muta', '@critico'] }, async ({ page, escenarioConPersona }) => {
  const email = escenarioConPersona.persona!.email
  await page.goto('/login')
  await page.getByText('¿Olvidó su contraseña?').click()
  await page.fill('#olvide-email', email)
  await page.click('button[type=submit]')
  await expect(page.getByRole('status')).toContainText('Si el correo está registrado')
  await page.goto(ultimoEnlaceDeAcceso(email))
  await page.fill('#clave-nueva', 'Palmeras-Cafe-2026')
  await page.fill('#clave-repetida', 'Palmeras-Cafe-2026')
  await page.click('button[type=submit]')
  await page.waitForURL('**/login')
  await entrar(page, email, 'Palmeras-Cafe-2026')
  // La anterior ya no sirve.
  await page.getByRole('button', { name: /cerrar sesión/i }).first().click()
  await page.waitForURL('**/login')
  await page.fill('input[type=email]', email)
  await page.fill('input[type=password]', CLAVE)
  await page.click('button[type=submit]')
  await expect(page.getByText('Correo o contraseña incorrectos.')).toBeVisible()
})
