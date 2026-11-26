import { entrar, esperarRespuesta, expect, test } from '../fixtures'

test.beforeEach(async ({ page }) => {
  await entrar(page)
})

test('el Kanban tiene una columna por cada estado de la pestaña', { tag: '@lectura' }, async ({ page }) => {
  const columnas = async () => (await page.locator('span.uppercase.tracking-wider').allTextContents()).map(c => c.toLowerCase())
  await page.goto('/dashboard?vista=kanban')
  await expect(page.getByText('Acera central').first()).toBeVisible()
  expect(await columnas()).toEqual(expect.arrayContaining(['pendiente', 'en progreso', 'en revisión']))
  expect(await columnas()).not.toContain('completado')
  await page.getByRole('tab', { name: /^Finalizados/ }).click()
  await expect(page.getByText('Alumbrado').first()).toBeVisible()
  expect(await columnas()).toEqual(expect.arrayContaining(['completado', 'cancelado']))
})

test('pasar a Pausado desde el dashboard pide el motivo; cerrar no se ofrece ahí', { tag: '@muta' }, async ({ page, escenario }) => {
  // Por la búsqueda, para que la fila no se redibuje justo cuando se abre el menú.
  // Se busca por el identificador del escenario (axios codifica el espacio del nombre como «+»).
  const filtrado = esperarRespuesta(page, new RegExp(`proyectosRead/\\?.*search=.*${escenario.run}`))
  await page.goto(`/dashboard?q=${encodeURIComponent(escenario.proyecto.nombre)}`)
  await filtrado
  await expect(page.getByText(escenario.proyecto.nombre).first()).toBeVisible()
  await page.getByTitle('Cambiar estado').first().click()
  await expect(page.getByRole('button', { name: 'Cancelado' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Pausado' }).first().click()
  const dialogo = page.getByRole('dialog', { name: 'Pasar a Pausado' })
  await expect(dialogo).toBeVisible()
  await dialogo.locator('textarea').fill('Se reprogramó para el próximo año')
  const guardado = esperarRespuesta(page, '/proyectosWrite/', 'PATCH')
  await page.getByRole('button', { name: 'Confirmar' }).click()
  expect((await guardado).status()).toBe(200)
})

test('el tablero de tareas muestra todos los estados y cambia el estado con PATCH', { tag: ['@muta', '@critico'] }, async ({ page, escenario }) => {
  await page.goto(`/projects/${escenario.proyecto.id}`)
  await expect(page.getByText('Excavar')).toBeVisible()
  const grupos = (await page.locator('span.uppercase.tracking-wider').allTextContents()).map(g => g.toLowerCase())
  for (const estado of ['pendiente', 'en progreso', 'en revisión', 'completado', 'pausado']) expect(grupos).toContain(estado)
  await expect(page.getByText(/1\/5 tareas/)).toBeVisible()
  const patch = esperarRespuesta(page, '/task/tareas/', 'PATCH')
  await page.getByLabel('Estado de la tarea Demarcar').selectOption({ label: 'Completado' })
  expect((await patch).status()).toBe(200)
  await expect(page.getByText(/2\/5 tareas/)).toBeVisible()
})

test('los jefes se ven y se editan en Departamentos', { tag: '@lectura' }, async ({ page }) => {
  await page.goto('/departments')
  await expect(page.getByRole('columnheader', { name: 'Jefe' })).toBeVisible()
  await expect(page.getByText('Jorge Prueba').first()).toBeVisible()
})

test('la notificación se puede marcar como leída', { tag: '@muta' }, async ({ page }) => {
  await page.getByRole('button', { name: /notificaci(ón|ones)/i }).first().click()
  const marcar = page.getByRole('button', { name: 'Marcar como leída' }).first()
  await expect(marcar).toBeVisible()
  const patch = esperarRespuesta(page, '/notificaciones/', 'PATCH')
  await marcar.click()
  expect((await patch).status()).toBe(200)
})
