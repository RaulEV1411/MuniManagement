import { entrar, esperarRespuesta, expect, test } from '../fixtures'

// Todo con un tipo de proyecto propio: los campos obligatorios no aparecen en los proyectos de las demás pruebas.
test('campos personalizados: el catálogo, el asistente, la ficha y las tareas', { tag: '@muta' }, async ({ page }, info) => {
  const run = `${info.workerIndex}-${Date.now().toString(36)}`
  const tipo = `Tipo ${run}`
  const expediente = `Expediente ${run}`
  const cuadrilla = `Cuadrilla ${run}`
  await entrar(page)

  await test.step('el tipo y dos campos en Configuración', async () => {
    await page.goto('/config')
    await page.getByRole('tab', { name: /^Tipos/ }).click()
    await page.getByLabel('Nuevo tipo...').fill(tipo)
    await page.getByRole('button', { name: 'Crear' }).click()
    await expect(page.getByText(tipo, { exact: true })).toBeVisible()
    await page.getByRole('tab', { name: 'Campos' }).click()
    const form = page.getByRole('form', { name: 'Nuevo campo' })
    await form.getByLabel('Nombre del campo').fill(expediente)
    await form.getByLabel('Obligatorio').check()
    await form.getByRole('checkbox', { name: tipo }).check()
    await form.getByRole('button', { name: 'Crear campo' }).click()
    await expect(page.getByRole('region', { name: 'En los proyectos' }).getByText(expediente, { exact: true })).toBeVisible()
    await form.getByLabel('Nombre del campo').fill(cuadrilla)
    await form.getByLabel('Se pide en').selectOption('tarea')
    await form.getByLabel('Tipo de dato').selectOption('lista')
    await form.getByLabel('Opciones (una por línea)').fill('Norte\nSur')
    await form.getByRole('checkbox', { name: tipo }).check()
    await form.getByRole('button', { name: 'Crear campo' }).click()
    await expect(page.getByRole('region', { name: 'En las tareas' }).getByText(`Lista (Norte, Sur) · ${tipo}`)).toBeVisible()
  })

  let proyectoId = ''
  await test.step('el asistente pide el obligatorio del tipo', async () => {
    await page.goto('/projects/new')
    await page.getByLabel('Nombre del proyecto').fill(`Campos ${run}`.slice(0, 50))
    await page.getByLabel('Descripción').fill('Proyecto con datos adicionales')
    await page.getByLabel('Tipo de proyecto').selectOption({ label: tipo })
    await page.getByRole('button', { name: 'Siguiente' }).click()
    await page.getByLabel('Fecha inicio').fill('2030-03-01')
    await page.getByLabel('Fecha entrega').fill('2030-03-31')
    await page.getByLabel(/^Costo estimado/).fill('0')
    await page.getByRole('button', { name: 'Siguiente' }).click()
    await page.getByLabel('Departamento').selectOption({ label: 'Obras' })
    await page.getByLabel('Responsable').selectOption({ label: 'Ana Prueba' })
    await page.getByRole('button', { name: 'Crear proyecto' }).click()
    await expect(page.getByText(`Complete «${expediente}»`)).toBeVisible()
    await page.getByLabel(expediente).fill('EXP-2030-14')
    const creado = esperarRespuesta(page, '/proyectosWrite/', 'POST')
    await page.getByRole('button', { name: 'Crear proyecto' }).click()
    const respuesta = await creado
    expect(respuesta.status()).toBe(201)
    proyectoId = (await respuesta.json()).proyect_ID
  })

  await test.step('la ficha muestra y edita el dato', async () => {
    await page.goto(`/projects/${proyectoId}`)
    await page.getByRole('tab', { name: /^Información/ }).click()
    const ficha = page.getByRole('region', { name: 'Ficha del proyecto' })
    await expect(ficha.getByRole('definition').filter({ hasText: 'EXP-2030-14' })).toBeVisible()
    await ficha.getByRole('button', { name: 'Editar ficha' }).click()
    const dialogo = page.getByRole('dialog', { name: 'Editar ficha' })
    await expect(dialogo.getByLabel(expediente)).toHaveValue('EXP-2030-14')
    await dialogo.getByLabel(expediente).fill('EXP-2030-15')
    const guardado = esperarRespuesta(page, `/proyectosWrite/${proyectoId}/`, 'PATCH')
    await dialogo.getByRole('button', { name: 'Guardar ficha' }).click()
    expect((await guardado).status()).toBe(200)
    await expect(ficha.getByRole('definition').filter({ hasText: 'EXP-2030-15' })).toBeVisible()
  })

  await test.step('la tarea nueva pide el campo de tarea y el detalle lo muestra', async () => {
    await page.getByRole('tab', { name: /^Tareas/ }).click()
    await page.getByRole('button', { name: 'Nueva tarea' }).first().click()
    const dialogo = page.getByRole('dialog', { name: 'Nueva tarea' })
    await dialogo.getByLabel('Nombre').first().fill('Bachear')
    await dialogo.getByLabel(/^Fecha (de )?inicio/).fill('2030-03-02')
    await dialogo.getByLabel(/^Fecha (de )?entrega/).fill('2030-03-09')
    await dialogo.getByLabel(cuadrilla).selectOption('Sur')
    const creada = esperarRespuesta(page, '/task/tareas/', 'POST')
    await dialogo.getByRole('button', { name: /Crear/ }).click()
    expect((await creada).status()).toBe(201)
    await page.getByRole('button', { name: 'Bachear', exact: true }).click()
    const datos = page.getByRole('definition').filter({ hasText: 'Sur' })
    await expect(datos).toBeVisible()
  })
})
