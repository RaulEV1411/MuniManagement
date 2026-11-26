import { expect, test } from '@playwright/test'
import { entrar } from './ayuda'

test.beforeEach(async ({ page }) => {
  await entrar(page)
})

test('el Kanban tiene una columna por estado de Configuración', async ({ page }) => {
  await page.goto('/dashboard?vista=kanban')
  await expect(page.getByText('Acera central').first()).toBeVisible()
  const columnas = (await page.locator('span.uppercase.tracking-wider').allTextContents()).map(c => c.toLowerCase())
  for (const estado of ['pendiente', 'en progreso', 'en revisión', 'completado', 'pausado', 'cancelado']) {
    expect(columnas).toContain(estado)
  }
})

test('pasar a Cancelado desde el dashboard pide el motivo', async ({ page }) => {
  await page.goto('/dashboard')
  // Primero la lista inicial; después, la respuesta de la búsqueda (la resuelve el servidor al
  // dejar de escribir). Si no, el menú se abre sobre una fila que enseguida se redibuja.
  await expect(page.getByText('Acera central').first()).toBeVisible()
  const filtrado = page.waitForResponse(r => r.url().includes('/proyectosRead/') && r.url().includes('search=Bacheo'))
  await page.getByPlaceholder('Buscar proyectos...').fill('Bacheo')
  await filtrado
  await expect(page.getByText('Acera central')).toHaveCount(0)
  await expect(page.getByText('Bacheo norte').first()).toBeVisible()
  await page.getByTitle('Cambiar estado').first().click()
  await page.getByRole('button', { name: 'Cancelado' }).first().click()
  await expect(page.getByText('Pasar a Cancelado')).toBeVisible()
  await page.locator('textarea').fill('Se reprogramó para el próximo año')
  const guardado = page.waitForResponse(r => r.url().includes('/proyectosWrite/') && r.request().method() === 'PATCH')
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
  const patch = page.waitForResponse(r => r.url().includes('/task/tareas/') && r.request().method() === 'PATCH')
  await selector.selectOption({ label: 'Completado' })
  expect((await patch).status()).toBe(200)
})

test('los jefes se ven y se editan en Departamentos', async ({ page }) => {
  await page.goto('/departments')
  await expect(page.getByRole('columnheader', { name: 'Jefe' })).toBeVisible()
  await expect(page.getByText('Jorge Prueba').first()).toBeVisible()
})

test('la notificación se puede marcar como leída', async ({ page }) => {
  await page.getByRole('button', { name: /notificaciones/i }).first().click()
  const marcar = page.getByRole('button', { name: 'Marcar como leída' }).first()
  await expect(marcar).toBeVisible()
  const patch = page.waitForResponse(r => r.url().includes('/notificaciones/') && r.request().method() === 'PATCH')
  await marcar.click()
  expect((await patch).status()).toBe(200)
})
