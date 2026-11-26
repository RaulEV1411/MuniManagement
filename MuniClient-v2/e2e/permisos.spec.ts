import { expect, test, type Page } from '@playwright/test'
import { FABI, entrar } from './ayuda'

async function cambiarCelda(admin: Page, etiqueta: string, valor: string) {
  const guardado = admin.waitForResponse(r => r.url().includes('/users/roles/') && r.request().method() === 'PATCH')
  await admin.getByLabel(etiqueta).selectOption(valor)
  expect((await guardado).status()).toBe(200)
}

test('sin permiso no se ofrece «Nuevo proyecto»; la matriz se lo habilita', async ({ page, browser }) => {
  await entrar(page, FABI)
  // Por texto y no por rol: getByRole descarta lo que tiene el atributo hidden aunque se vea.
  const nuevo = page.locator('button', { hasText: 'Nuevo proyecto' })
  await expect(page.getByRole('link', { name: 'Acera central' }).first()).toBeVisible()
  await expect(nuevo.first()).toBeHidden()
  await page.goto('/projects/new')
  await expect(page.getByText('Su rol no permite crear proyectos.')).toBeVisible()

  const admin = await (await browser.newContext()).newPage()
  await entrar(admin)
  await admin.goto('/config')
  await admin.getByRole('tab', { name: 'Roles y permisos' }).click()
  await cambiarCelda(admin, 'Crear proyectos · Funcionario', 'departamento')

  // Los permisos llegan con la sesión: al recargar, aparece el botón.
  await page.goto('/dashboard')
  await expect(nuevo.first()).toBeVisible()

  await cambiarCelda(admin, 'Crear proyectos · Funcionario', '')
})

test('el equipo de un proyecto: agregar con vencimiento, verlo y quitarlo', async ({ page }) => {
  await entrar(page)
  await page.getByRole('link', { name: 'Acera central' }).first().click()
  await page.getByRole('tab', { name: /^Información/ }).click()
  await page.getByRole('button', { name: 'Agregar persona' }).click()
  const dialogo = page.getByRole('dialog', { name: 'Agregar al equipo' })
  await dialogo.getByLabel('Persona').selectOption({ label: 'Jorge Prueba · Jefe de Departamento' })
  await dialogo.getByLabel('Rol en el proyecto').selectOption({ label: 'Observador' })
  const enDosDias = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10)
  await dialogo.getByLabel('Hasta (opcional)').fill(enDosDias)
  await dialogo.getByLabel('Motivo (opcional)').fill('Revisión de planos')
  const creado = page.waitForResponse(r => r.url().includes('/projects/miembros/') && r.request().method() === 'POST')
  await dialogo.getByRole('button', { name: 'Guardar' }).click()
  expect((await creado).status()).toBe(201)

  const equipo = page.getByRole('region', { name: 'Equipo del proyecto' })
  await expect(equipo.getByText('Jorge Prueba')).toBeVisible()
  await expect(equipo.getByText(/vence en 2 días/)).toBeVisible()

  await equipo.getByRole('button', { name: 'Quitar a Jorge Prueba del equipo' }).click()
  await page.getByRole('dialog', { name: /Quitar a Jorge Prueba/ }).getByRole('button', { name: 'Quitar' }).click()
  await expect(equipo.getByText('Jorge Prueba')).toHaveCount(0)
  await expect(equipo.getByRole('button', { name: /accesos anteriores \(1\)/ })).toBeVisible()
})

test('«ver como»: el perfil muestra lo que puede hacer la persona', async ({ page }) => {
  await entrar(page)
  await page.goto('/users')
  await page.getByRole('link', { name: 'Fabi Prueba' }).click()
  await expect(page.getByText('Lo que puede hacer · Funcionario')).toBeVisible()
  await expect(page.getByText('Ver proyectos')).toBeVisible()
})
