import type { Page } from '@playwright/test'
import { BETO, entrar, esperarRespuesta, expect, test } from '../fixtures'

async function guardar(page: Page) {
  const respuesta = esperarRespuesta(page, /\/api\/v1\/configuracion\/$/, 'PATCH')
  await page.getByRole('button', { name: 'Guardar' }).click()
  expect((await respuesta).status()).toBe(200)
}

// Cambia el nombre y el color de toda la institución: corre al final, de a una, y deja todo como estaba.
test('el administrador cambia nombre y color, y se ven en toda la app', { tag: '@global' }, async ({ page }) => {
  await entrar(page)
  await page.goto('/config')
  const nombreOriginal = await page.locator('#inst-nombre').inputValue()
  const colorOriginal = await page.locator('#inst-color_primario').inputValue()

  // Un color claro no se puede guardar: el texto blanco encima no se leería.
  await page.fill('#inst-color_primario', '#f5d90a')
  await expect(page.getByRole('alert')).toContainText('no se lee')
  await expect(page.getByRole('button', { name: 'Guardar' })).toBeDisabled()

  await page.fill('#inst-nombre', 'Municipalidad de Esparza')
  await page.fill('#inst-color_primario', '#1f6f43')
  await guardar(page)

  await expect(page.locator('aside').getByText('Municipalidad de Esparza')).toBeVisible()
  await expect(page).toHaveTitle('Configuración · Municipalidad de Esparza')
  const fondo = await page.locator('.bg-ocean-500').first().evaluate(el => getComputedStyle(el).backgroundColor)
  expect(fondo).toBe('rgb(31, 111, 67)')

  await page.goto('/publico')
  await expect(page.getByText(/Municipalidad de Esparza/)).toBeVisible()
  await expect(page).toHaveTitle('Portal de proyectos · Municipalidad de Esparza')

  await page.goto('/config')
  await page.fill('#inst-nombre', nombreOriginal)
  await page.fill('#inst-color_primario', colorOriginal)
  await guardar(page)
})

test('un funcionario ve los datos de la institución, pero no los cambia', { tag: '@lectura' }, async ({ page }) => {
  await entrar(page, BETO)
  await page.goto('/config')
  await expect(page.getByText('Su rol no permite cambiar estos datos.')).toBeVisible()
  await expect(page.locator('#inst-nombre')).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Guardar' })).toHaveCount(0)
})
