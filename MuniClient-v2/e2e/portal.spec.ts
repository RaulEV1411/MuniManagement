import { expect, test } from '@playwright/test'

test('el portal muestra solo lo público', async ({ page }) => {
  await page.goto('/publico')
  await expect(page.getByRole('heading', { name: 'Portal de proyectos' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Acera central' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Plan interno' })).toHaveCount(0)
})

test('la búsqueda consulta al dejar de escribir, no por cada tecla', async ({ page }) => {
  await page.goto('/publico')
  await expect(page.getByRole('heading', { name: 'Acera central' })).toBeVisible()
  const busquedas: string[] = []
  page.on('request', r => { if (r.url().includes('/api/v1/public/projects/?search=')) busquedas.push(r.url()) })
  await page.getByPlaceholder(/Buscar por nombre/).pressSequentially('puente', { delay: 40 })
  await expect(page.getByRole('heading', { name: 'Puente río' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Acera central' })).toHaveCount(0)
  expect(busquedas.length).toBe(1)
})

test('el detalle público no expone datos de personas', async ({ page }) => {
  await page.goto('/publico')
  await page.getByRole('heading', { name: 'Acera central' }).click()
  await expect(page.getByText('Tareas del proyecto')).toBeVisible()
  const texto = await page.locator('body').innerText()
  expect(texto).not.toContain('@muni.test')
  expect(texto).not.toContain('Fabi')
})
