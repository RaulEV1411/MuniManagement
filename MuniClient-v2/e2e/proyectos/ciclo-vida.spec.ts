import { entrar, esperarRespuesta, expect, test } from '../fixtures'

test('cerrar, archivar, devolver y reabrir un proyecto (no se borra)', { tag: ['@muta', '@critico'] }, async ({ page, escenario }) => {
  const { proyecto } = escenario
  await entrar(page)
  await page.goto(`/projects/${proyecto.id}`)
  await expect(page.getByRole('button', { name: 'Eliminar proyecto' })).toHaveCount(0)

  await test.step('cerrar con el formulario: cómo terminó, fecha y costo reales, resumen y lecciones', async () => {
    await page.getByRole('button', { name: 'Cerrar proyecto' }).click()
    const cierre = page.getByRole('dialog', { name: 'Cerrar el proyecto' })
    await cierre.getByLabel('Cómo terminó').selectOption({ label: 'Completado' })
    await cierre.getByLabel('Costo real').fill('1400000')
    await cierre.getByLabel('Resumen del cierre o motivo').fill('Obra entregada y recibida por la comunidad')
    await cierre.getByLabel('Lecciones aprendidas (opcional)').fill('Coordinar antes el cierre de la vía')
    const cerrado = esperarRespuesta(page, '/cerrar/')
    await cierre.getByRole('button', { name: 'Cerrar proyecto' }).click()
    expect((await cerrado).status()).toBe(201)
  })

  await test.step('cerrado: muestra el cierre y ya no se edita', async () => {
    await page.getByRole('tab', { name: /^Información/ }).click()
    const tarjeta = page.getByRole('region', { name: 'Cierre del proyecto' })
    await expect(tarjeta).toContainText('Obra entregada')
    await expect(tarjeta).toContainText('Coordinar antes')
    await expect(page.getByRole('button', { name: 'Nueva tarea' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Editar proyecto' })).toHaveCount(0)
  })

  await test.step('el Administrador lo archiva: sale de las listas y queda en Archivados', async () => {
    await page.getByRole('button', { name: 'Archivar' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Archivar' }).click()
    await expect(page.getByText('Archivado', { exact: true })).toBeVisible()
    // Se espera la respuesta de la lista: si no, «no está» pasaría antes de que cargue.
    const lista = esperarRespuesta(page, /proyectosRead\/\?.*categoria=finalizado/)
    await page.goto(`/dashboard?pestana=finalizado&q=${encodeURIComponent(proyecto.nombre)}`)
    expect((await (await lista).json()).count).toBe(0)
    await page.getByRole('tab', { name: /^Archivados/ }).click()
    await page.getByRole('link', { name: proyecto.nombre }).first().click()
  })

  await test.step('se devuelve a las listas y se reabre, con su motivo', async () => {
    await page.getByRole('button', { name: 'Devolver a las listas' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Devolver' }).click()
    await expect(page.getByText('Archivado', { exact: true })).toHaveCount(0)
    await page.getByRole('button', { name: 'Reabrir' }).click()
    const reabrir = page.getByRole('dialog', { name: 'Reabrir el proyecto' })
    await reabrir.getByLabel('Vuelve a').selectOption({ label: 'En revisión' })
    await reabrir.getByLabel('Motivo').fill('Faltó la baranda')
    const reabierto = esperarRespuesta(page, '/reabrir/')
    await reabrir.getByRole('button', { name: 'Reabrir' }).click()
    expect((await reabierto).status()).toBe(200)
    await expect(page.getByRole('button', { name: 'Cerrar proyecto' })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Cierre del proyecto' })).toHaveCount(0)
  })
})

// Crea y borra un estado del catálogo, que comparten todas las pruebas: corre al final, de a una.
test('un estado propio elige su categoría y aparece en su pestaña', { tag: '@global' }, async ({ page }) => {
  await entrar(page)
  await page.goto('/config')
  await page.getByRole('tab', { name: /^Estados/ }).click()
  await page.getByLabel('Nuevo estado...').fill('Suspendido por lluvia')
  await page.getByLabel('Categoría del estado nuevo').selectOption({ label: 'Pausado' })
  const creado = esperarRespuesta(page, '/projects/estados/', 'POST')
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
