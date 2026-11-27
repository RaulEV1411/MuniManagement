import type { Page } from '@playwright/test'
import { FABI, entrar, esperarRespuesta, expect, test } from '../fixtures'

async function cambiarCelda(admin: Page, etiqueta: string, valor: string) {
  const guardado = esperarRespuesta(admin, '/users/roles/', 'PATCH')
  await admin.getByLabel(etiqueta).selectOption(valor)
  expect((await guardado).status()).toBe(200)
}

// Cambia la matriz de permisos de toda la institución (y la deja como estaba): corre al final, de a una.
test('sin permiso no se ofrece «Nuevo proyecto»; la matriz se lo habilita', { tag: ['@global', '@critico'] }, async ({ page, browser }) => {
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

test('el equipo de un proyecto: agregar con vencimiento, verlo y quitarlo', { tag: ['@muta', '@critico'] }, async ({ page, escenario }) => {
  await entrar(page)
  await page.goto(`/projects/${escenario.proyecto.id}`)
  await page.getByRole('tab', { name: /^Información/ }).click()
  await page.getByRole('button', { name: 'Agregar persona' }).click()
  const dialogo = page.getByRole('dialog', { name: 'Agregar al equipo' })
  await dialogo.getByLabel('Persona').selectOption({ label: 'Jorge Prueba · Jefe de Departamento' })
  await dialogo.getByLabel('Rol en el proyecto').selectOption({ label: 'Observador' })
  // En la fecha local, como el servidor: toISOString da la de UTC, que en Costa Rica ya es mañana después de las 18:00.
  const d = new Date(Date.now() + 2 * 86_400_000)
  const enDosDias = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  await dialogo.getByLabel('Hasta (opcional)').fill(enDosDias)
  await dialogo.getByLabel('Motivo (opcional)').fill('Revisión de planos')
  const creado = esperarRespuesta(page, '/projects/miembros/', 'POST')
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

test('«ver como»: el perfil muestra lo que puede hacer la persona', { tag: '@lectura' }, async ({ page }) => {
  await entrar(page)
  await page.goto('/users')
  await page.getByRole('link', { name: 'Fabi Prueba' }).click()
  await expect(page.getByText('Lo que puede hacer · Funcionario')).toBeVisible()
  await expect(page.getByText('Ver proyectos')).toBeVisible()
})
