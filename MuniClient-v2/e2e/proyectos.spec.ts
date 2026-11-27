import { expect, test } from '@playwright/test'
import { entrar } from './ayuda'

test.beforeEach(async ({ page }) => {
  await entrar(page)
})

test('el Kanban tiene una columna por cada estado de la pestaña', async ({ page }) => {
  const columnas = async () => (await page.locator('span.uppercase.tracking-wider').allTextContents()).map(c => c.toLowerCase())
  await page.goto('/dashboard?vista=kanban')
  await expect(page.getByText('Acera central').first()).toBeVisible()
  expect(await columnas()).toEqual(expect.arrayContaining(['pendiente', 'en progreso', 'en revisión']))
  expect(await columnas()).not.toContain('completado')
  await page.getByRole('tab', { name: /^Finalizados/ }).click()
  await expect(page.getByText('Alumbrado').first()).toBeVisible()
  expect(await columnas()).toEqual(expect.arrayContaining(['completado', 'cancelado']))
})

test('pasar a Pausado desde el dashboard pide el motivo; cerrar no se ofrece ahí', async ({ page }) => {
  await page.goto('/dashboard')
  // Primero la lista inicial; después, la respuesta de la búsqueda (la resuelve el servidor al
  // dejar de escribir). Si no, el menú se abre sobre una fila que enseguida se redibuja.
  await expect(page.getByText('Acera central').first()).toBeVisible()
  const filtrado = page.waitForResponse(r => r.status() !== 401 && r.url().includes('/proyectosRead/') && r.url().includes('search=Bacheo'))
  await page.getByPlaceholder('Buscar proyectos...').fill('Bacheo')
  await filtrado
  await expect(page.getByText('Acera central')).toHaveCount(0)
  await expect(page.getByText('Bacheo norte').first()).toBeVisible()
  await page.getByTitle('Cambiar estado').first().click()
  await expect(page.getByRole('button', { name: 'Cancelado' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Pausado' }).first().click()
  const dialogo = page.getByRole('dialog', { name: 'Pasar a Pausado' })
  await expect(dialogo).toBeVisible()
  await dialogo.locator('textarea').fill('Se reprogramó para el próximo año')
  const guardado = page.waitForResponse(r => r.status() !== 401 && r.url().includes('/proyectosWrite/') && r.request().method() === 'PATCH')
  await page.getByRole('button', { name: 'Confirmar' }).click()
  expect((await guardado).status()).toBe(200)
})

test('el tablero de tareas muestra todos los estados y cambia el estado con PATCH', async ({ page }) => {
  await page.goto('/dashboard')
  await page.getByText('Acera central').first().click()
  await page.waitForURL(/\/projects\//)
  await expect(page.getByText('Excavar')).toBeVisible()
  const grupos = (await page.locator('span.uppercase.tracking-wider').allTextContents()).map(g => g.toLowerCase())
  for (const estado of ['pendiente', 'en progreso', 'en revisión', 'completado', 'pausado']) expect(grupos).toContain(estado)
  await expect(page.getByText(/1\/5 tareas/)).toBeVisible()
  const selector = page.locator('select').filter({ has: page.locator('option', { hasText: 'Completado' }) }).first()
  const patch = page.waitForResponse(r => r.status() !== 401 && r.url().includes('/task/tareas/') && r.request().method() === 'PATCH')
  await selector.selectOption({ label: 'Completado' })
  expect((await patch).status()).toBe(200)
})

test('los jefes se ven y se editan en Departamentos', async ({ page }) => {
  await page.goto('/departments')
  await expect(page.getByRole('columnheader', { name: 'Jefe' })).toBeVisible()
  await expect(page.getByText('Jorge Prueba').first()).toBeVisible()
})

test('la notificación se puede marcar como leída', async ({ page }) => {
  await page.getByRole('button', { name: /notificaci(ón|ones)/i }).first().click()
  const marcar = page.getByRole('button', { name: 'Marcar como leída' }).first()
  await expect(marcar).toBeVisible()
  const patch = page.waitForResponse(r => r.status() !== 401 && r.url().includes('/notificaciones/') && r.request().method() === 'PATCH')
  await marcar.click()
  expect((await patch).status()).toBe(200)
})
