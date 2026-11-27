import { expect, test } from '@playwright/test'
import { entrar } from './ayuda'

test('cerrar, archivar, devolver y reabrir un proyecto (no se borra)', async ({ page }) => {
  await entrar(page)
  await page.getByRole('link', { name: 'Puente río' }).first().click()
  await page.waitForURL(/\/projects\//)
  await expect(page.getByRole('button', { name: 'Eliminar proyecto' })).toHaveCount(0)

  // Cerrar con el formulario: cómo terminó, fecha y costo reales, resumen y lecciones.
  await page.getByRole('button', { name: 'Cerrar proyecto' }).click()
  const cierre = page.getByRole('dialog', { name: 'Cerrar el proyecto' })
  await cierre.getByLabel('Cómo terminó').selectOption({ label: 'Completado' })
  await cierre.getByLabel('Costo real').fill('1400000')
  await cierre.getByLabel('Resumen del cierre o motivo').fill('Puente entregado y recibido por la comunidad')
  await cierre.getByLabel('Lecciones aprendidas (opcional)').fill('Coordinar antes el cierre de la vía')
  const cerrado = page.waitForResponse(r => r.status() !== 401 && r.url().includes('/cerrar/'))
  await cierre.getByRole('button', { name: 'Cerrar proyecto' }).click()
  expect((await cerrado).status()).toBe(201)

  // Cerrado: muestra el cierre y ya no se edita.
  await page.getByRole('tab', { name: /^Información/ }).click()
  const tarjeta = page.getByRole('region', { name: 'Cierre del proyecto' })
  await expect(tarjeta).toContainText('Puente entregado')
  await expect(tarjeta).toContainText('Coordinar antes')
  await expect(page.getByRole('button', { name: 'Nueva tarea' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Editar proyecto' })).toHaveCount(0)

  // El Administrador lo archiva: sale de las listas y queda en Archivados.
  await page.getByRole('button', { name: 'Archivar' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Archivar' }).click()
  await expect(page.getByText('Archivado', { exact: true })).toBeVisible()
  await page.goto('/dashboard?pestana=finalizado')
  await expect(page.getByText('Alumbrado').first()).toBeVisible()
  await expect(page.getByText('Puente río')).toHaveCount(0)
  await page.getByRole('tab', { name: /^Archivados/ }).click()
  await page.getByRole('link', { name: 'Puente río' }).first().click()

  // Se devuelve a las listas y se reabre, con su motivo.
  await page.getByRole('button', { name: 'Devolver a las listas' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Devolver' }).click()
  await expect(page.getByText('Archivado', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Reabrir' }).click()
  const reabrir = page.getByRole('dialog', { name: 'Reabrir el proyecto' })
  await reabrir.getByLabel('Vuelve a').selectOption({ label: 'En revisión' })
  await reabrir.getByLabel('Motivo').fill('Faltó la baranda')
  const reabierto = page.waitForResponse(r => r.status() !== 401 && r.url().includes('/reabrir/'))
  await reabrir.getByRole('button', { name: 'Reabrir' }).click()
  expect((await reabierto).status()).toBe(200)
  await expect(page.getByRole('button', { name: 'Cerrar proyecto' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Cierre del proyecto' })).toHaveCount(0)
})

test('un estado propio elige su categoría y aparece en su pestaña', async ({ page }) => {
  await entrar(page)
  await page.goto('/config')
  await page.getByRole('tab', { name: /^Estados/ }).click()
  await page.getByLabel('Nuevo estado...').fill('Suspendido por lluvia')
  await page.getByLabel('Categoría del estado nuevo').selectOption({ label: 'Pausado' })
  const creado = page.waitForResponse(r => r.status() !== 401 && r.url().includes('/projects/estados/') && r.request().method() === 'POST')
  await page.getByRole('button', { name: 'Crear' }).click()
  expect((await creado).status()).toBe(201)
  const fila = page.locator('div', { hasText: /^Suspendido por lluviaPausado/ }).last()
  await expect(fila).toBeVisible()

  // En Proyectos, el filtro de estado de la pestaña Pausados lo ofrece.
  await page.goto('/dashboard?pestana=pausado')
  await expect(page.getByLabel('Filtrar por estado').locator('option', { hasText: 'Suspendido por lluvia' })).toHaveCount(1)

  await page.goto('/config')
  await page.getByRole('tab', { name: /^Estados/ }).click()
  await page.getByRole('button', { name: 'Eliminar Suspendido por lluvia' }).click()
  await page.getByRole('dialog').getByRole('button', { name: /Eliminar|Confirmar/ }).click()
  await expect(page.getByText('Suspendido por lluvia')).toHaveCount(0)
})

