import { readFileSync } from 'fs'
import { expect, test } from '@playwright/test'
import { FABI, entrar } from './ayuda'

test('el aviso es público, se publica con sus encargados y se acepta al entrar', async ({ page, browser }) => {
  await page.goto('/privacidad')
  await expect(page.getByRole('heading', { name: 'Aviso de privacidad', level: 1 })).toBeVisible()
  await expect(page.getByText('Quién más trata sus datos')).toBeVisible()

  // El Administrador agrega un encargado: es una versión nueva.
  const admin = await (await browser.newContext()).newPage()
  await entrar(admin)
  await admin.goto('/config')
  await admin.getByRole('tab', { name: /^Privacidad/ }).click()
  await admin.getByRole('button', { name: 'Agregar encargado' }).click()
  await admin.getByLabel('Proveedor').last().fill('Servicio de correo')
  await admin.getByLabel('Qué datos').last().fill('Nombre y correo')
  await admin.getByLabel('Para qué').last().fill('Enviar avisos')
  await admin.getByLabel('País').last().fill('Estados Unidos')
  const guardado = admin.waitForResponse(r => r.url().includes('/configuracion/') && r.request().method() === 'PATCH')
  await admin.getByRole('button', { name: 'Guardar y publicar' }).click()
  expect((await guardado).status()).toBe(200)

  // Fabi lo ve al entrar, con el encargado, y lo acepta.
  await entrar(page, FABI, undefined, { aceptarAviso: false })
  const aviso = page.getByRole('dialog', { name: 'Aviso de privacidad' })
  await expect(aviso).toContainText('Servicio de correo')
  await expect(aviso).toContainText('Estados Unidos')
  await aviso.getByRole('button', { name: 'Leí el aviso y acepto' }).click()
  await expect(aviso).toHaveCount(0)
  await page.reload()
  await expect(page.getByRole('link', { name: 'Acera central' }).first()).toBeVisible()
  await expect(aviso).toHaveCount(0)
})

test('cada persona descarga sus datos', async ({ page }) => {
  await entrar(page, FABI)
  await page.goto('/users')
  await page.getByRole('link', { name: 'Fabi Prueba' }).first().click()
  const descarga = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Descargar en JSON' }).click()
  const archivo = await descarga
  expect(archivo.suggestedFilename()).toMatch(/^mis-datos_.*\.json$/)
  const datos = JSON.parse(readFileSync(await archivo.path(), 'utf8'))
  expect(datos.persona.correo).toBe(FABI)
  expect(datos.tareas_asignadas.length).toBeGreaterThan(0)
})
