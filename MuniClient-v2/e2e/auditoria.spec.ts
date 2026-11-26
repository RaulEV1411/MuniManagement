import { expect, test } from '@playwright/test'
import { FABI, entrar } from './ayuda'

test('un cambio queda en la auditoría con el antes y el después, y la cadena se verifica', async ({ page }) => {
  await entrar(page)
  await page.goto('/config')
  const horario = page.getByLabel('Horario', { exact: true })
  const original = await horario.inputValue()
  const guardar = async (valor: string) => {
    await horario.fill(valor)
    const respuesta = page.waitForResponse(r => r.status() !== 401 && r.url().includes('/configuracion/') && r.request().method() === 'PATCH')
    await page.getByRole('button', { name: 'Guardar' }).click()
    expect((await respuesta).status()).toBe(200)
  }
  await guardar('L-V 7:30–15:30')

  await page.goto('/auditoria')
  await page.getByLabel('Filtrar por módulo').selectOption('configuracion')
  const fila = page.getByRole('region', { name: 'Registros de auditoría' }).getByRole('row').nth(1)
  await expect(fila).toContainText('Editó')
  await fila.getByRole('button', { name: /Ver el detalle/ }).click()
  await expect(page.getByText('L-V 7:30–15:30')).toBeVisible()

  await page.getByRole('button', { name: 'Verificar integridad' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'La cadena está íntegra' })).toBeVisible()

  await page.goto('/config')
  await guardar(original)
})

test('cerrar una sesión a distancia saca a la persona de la aplicación', async ({ page, browser }) => {
  await entrar(page, FABI)

  const admin = await (await browser.newContext()).newPage()
  await entrar(admin)
  await admin.goto('/users')
  await admin.getByRole('link', { name: 'Fabi Prueba' }).first().click()
  await admin.getByRole('tab', { name: 'Actividad' }).click()
  const sesiones = admin.getByRole('region', { name: 'Sesiones' })
  await expect(sesiones.getByText('Abierta').first()).toBeVisible()
  // Pueden quedar sesiones de otras pruebas: se cierran todas.
  const botones = sesiones.getByRole('button', { name: 'Cerrar sesión' })
  while (await botones.count()) {
    const antes = await botones.count()
    await botones.first().click()
    await admin.getByRole('dialog').getByRole('button', { name: 'Cerrar sesión' }).click()
    await expect(botones).toHaveCount(antes - 1)
  }

  // Sigue usando la app (sin recargar): la próxima petición la manda al login con el aviso.
  await page.getByRole('link', { name: 'Usuarios' }).click()
  await expect(page).toHaveURL(/\/login\?sesion=terminada/)
  await expect(page.getByText('Su sesión terminó')).toBeVisible()
})
