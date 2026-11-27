import { expect, test } from '@playwright/test'
import { entrar } from './ayuda'

const PDF = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF')

test('el detalle de una tarea: lista de verificación, comentarios, documentos y recursos con aviso de cruce', async ({ page }) => {
  await entrar(page)
  // Un vehículo en el catálogo.
  await page.goto('/config')
  await page.getByRole('tab', { name: /^Recursos/ }).click()
  await page.getByLabel('Nombre del recurso').fill('Vagoneta municipal')
  await page.getByLabel('Tipo de recurso').selectOption({ label: 'Vehículo' })
  await page.getByLabel('Código, placa o serie').fill('SM-4321')
  await page.getByRole('button', { name: 'Agregar' }).click()
  await expect(page.getByText('Vagoneta municipal')).toBeVisible()

  await page.goto('/dashboard')
  await page.getByRole('link', { name: 'Acera central' }).first().click()
  await page.getByRole('button', { name: 'Excavar', exact: true }).click()
  const detalle = page.getByRole('dialog', { name: 'Tarea: Excavar' })

  await detalle.getByLabel('Paso nuevo').fill('Pedir el permiso de corte de vía')
  await detalle.getByRole('button', { name: 'Agregar' }).click()
  // Se marca cuando responde el servidor.
  const paso = detalle.getByRole('checkbox', { name: 'Pedir el permiso de corte de vía' })
  await paso.click()
  await expect(paso).toBeChecked()
  await expect(detalle.getByText('(1/1)')).toBeVisible()

  await detalle.getByLabel('Comentario nuevo').fill('El viernes llega la máquina')
  await detalle.getByRole('button', { name: 'Comentar' }).click()
  await expect(detalle.getByText('El viernes llega la máquina')).toBeVisible()

  await detalle.getByLabel('Categoría del documento').selectOption({ label: 'Plano' })
  await detalle.locator('input[type=file]').setInputFiles({ name: 'plano-acera.pdf', mimeType: 'application/pdf', buffer: PDF })
  await expect(detalle.getByRole('link', { name: 'plano-acera.pdf' })).toBeVisible()

  await detalle.getByLabel('Recurso', { exact: true }).selectOption({ label: 'Vagoneta municipal (Vehículo)' })
  await detalle.getByRole('button', { name: 'Asignar' }).click()
  await expect(detalle.getByText('SM-4321')).toBeVisible()
  await page.keyboard.press('Escape')

  // La misma vagoneta en otra tarea con fechas que se cruzan: avisa, no impide. («Revisar planos» no
  // la cambia de estado ninguna otra prueba; su grupo arranca cerrado.)
  await page.getByRole('button', { name: /^En revisión \d+/ }).click()
  await page.getByRole('button', { name: 'Revisar planos', exact: true }).click()
  const otra = page.getByRole('dialog', { name: 'Tarea: Revisar planos' })
  await otra.getByLabel('Recurso', { exact: true }).selectOption({ label: 'Vagoneta municipal (Vehículo)' })
  await otra.getByRole('button', { name: 'Asignar' }).click()
  await expect(page.getByText(/también está en «Excavar»/)).toBeVisible()
})

test('una tarea que depende de otra no se termina antes', async ({ page }) => {
  await entrar(page)
  await page.getByRole('link', { name: 'Acera central' }).first().click()
  await page.getByRole('button', { name: /^En revisión \d+/ }).click()  // el grupo arranca cerrado
  await page.getByRole('button', { name: 'Editar la tarea Revisar planos' }).click()
  const edicion = page.getByRole('dialog', { name: /Editar tarea/ })
  await edicion.getByRole('checkbox', { name: 'Excavar' }).check()
  await edicion.getByRole('button', { name: /Guardar/ }).click()
  await expect(page.getByText('Depende de otra').first()).toBeVisible()
  const patch = page.waitForResponse(r => r.status() !== 401 && r.url().includes('/task/tareas/') && r.request().method() === 'PATCH')
  await page.getByLabel('Estado de la tarea Revisar planos').selectOption({ label: 'Completado' })
  expect((await patch).status()).toBe(400)
  await expect(page.getByText(/Primero hay que terminar: Excavar/)).toBeVisible()
})
