import { expect, test } from '@playwright/test'
import { FABI, JORGE, entrar } from './ayuda'

test('una prórroga pedida por quien tiene la tarea la aprueba la jefatura y se aplica sola', async ({ page, browser }) => {
  // Fabi tiene tareas en «Acera central»: como colaboradora puede pedir más plazo para una.
  await entrar(page, FABI)
  await page.getByRole('link', { name: 'Acera central' }).first().click()
  await page.getByRole('tab', { name: /^Solicitudes/ }).click()
  await page.getByRole('button', { name: 'Nueva solicitud' }).click()
  const dialogo = page.getByRole('dialog', { name: 'Nueva solicitud' })
  await dialogo.getByLabel('Qué pide').selectOption({ label: 'Prórroga de plazo' })
  await dialogo.getByLabel('Para').selectOption({ label: 'Tarea: Excavar' })
  const fecha = new Date(Date.now() + 20 * 86_400_000).toLocaleDateString('en-CA')
  await dialogo.getByLabel(/Nueva fecha de entrega/).fill(fecha)
  await dialogo.getByLabel('Justificación').fill('Llovió toda la semana y el terreno no deja excavar')
  const enviada = page.waitForResponse(r => r.status() !== 401 && r.url().includes('/solicitudes/solicitudes/') && r.request().method() === 'POST')
  await dialogo.getByRole('button', { name: 'Enviar solicitud' }).click()
  expect((await enviada).status()).toBe(201)
  await expect(page.getByText('Prórroga de plazo').first()).toBeVisible()
  await expect(page.getByText('Enviada').first()).toBeVisible()

  // Jorge, jefe del departamento, la tiene en «Por aprobar» y en el menú.
  const jefe = await (await browser.newContext()).newPage()
  await entrar(jefe, JORGE)
  await expect(jefe.getByRole('link', { name: /Solicitudes.*1 por aprobar/ })).toBeVisible()
  await jefe.getByRole('link', { name: /Solicitudes/ }).click()
  await jefe.getByRole('button', { name: /Prórroga de plazo/ }).first().click()
  const detalle = jefe.getByRole('dialog', { name: /Solicitud N\.º/ })
  await expect(detalle).toContainText('Llovió toda la semana')
  await detalle.getByRole('button', { name: 'Aprobar' }).click()
  await expect(detalle).toContainText('Orden de cambio aplicada')
  await expect(detalle).toContainText('Aprobada')

  // Para Fabi queda aprobada, con el resultado.
  await page.reload()
  await page.getByRole('tab', { name: /^Solicitudes/ }).click()
  await expect(page.getByText('Aprobada').first()).toBeVisible()
})

test('sin permiso de ajustar, el presupuesto se pide con una solicitud', async ({ page }) => {
  await entrar(page, FABI)
  await page.getByRole('link', { name: 'Acera central' }).first().click()
  await page.getByRole('tab', { name: /^Información/ }).click()
  await page.getByRole('button', { name: 'Solicitar ajuste' }).click()
  const dialogo = page.getByRole('dialog', { name: 'Nueva solicitud' })
  await expect(dialogo.getByLabel('Qué pide')).toHaveValue(/.+/)
  await expect(dialogo.getByLabel('Monto')).toBeVisible()
  await page.keyboard.press('Escape')
})
