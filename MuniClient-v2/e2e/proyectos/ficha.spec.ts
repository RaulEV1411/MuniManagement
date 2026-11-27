import { entrar, esperarRespuesta, expect, test } from '../fixtures'

test('la ficha, los hitos y los riesgos del proyecto', { tag: '@muta' }, async ({ page, escenario }) => {
  const { proyecto, run } = escenario
  const codigo = `EXP-${run}`
  await entrar(page)
  await page.goto(`/projects/${proyecto.id}`)
  await page.getByRole('tab', { name: /^Información/ }).click()

  await test.step('la ficha: expediente, SICOP, ubicación, objetivo, beneficiarios e indicadores', async () => {
    const ficha = page.getByRole('region', { name: 'Ficha del proyecto' })
    await ficha.getByRole('button', { name: 'Editar ficha' }).click()
    const dialogo = page.getByRole('dialog', { name: 'Editar ficha' })
    await dialogo.getByLabel('Código o expediente').fill(codigo)
    await dialogo.getByLabel('N.º de SICOP').fill('2026LA-000012-0002300001')
    await dialogo.getByLabel('Distrito').fill('Carmen')
    await dialogo.getByLabel('Latitud').fill('9.934739')
    await dialogo.getByLabel('Longitud').fill('-84.087502')
    await dialogo.getByLabel('Objetivo').fill('Una acera accesible frente a la escuela')
    await dialogo.getByLabel('Beneficiarios estimados (personas)').fill('1200')
    await dialogo.getByRole('button', { name: 'Agregar indicador' }).click()
    await dialogo.getByLabel('Indicador 1: nombre').fill('Acera construida')
    await dialogo.getByLabel('Indicador 1: unidad').fill('m')
    await dialogo.getByLabel('Indicador 1: meta').fill('500')
    await dialogo.getByLabel('Indicador 1: logrado').fill('120')
    const guardado = esperarRespuesta(page, `/proyectosWrite/${proyecto.id}/`, 'PATCH')
    await dialogo.getByRole('button', { name: 'Guardar ficha' }).click()
    expect((await guardado).status()).toBe(200)
    await expect(dialogo).toHaveCount(0)
    await expect(ficha).toContainText(codigo)
    await expect(ficha).toContainText('Carmen')
    await expect(ficha).toContainText('personas')
    await expect(ficha).toContainText('24 %')
    await expect(ficha.getByRole('link', { name: /9\.934739, -84\.087502/ })).toHaveAttribute('href', /openstreetmap\.org/)
  })

  await test.step('el proyecto se encuentra por su código', async () => {
    const lista = esperarRespuesta(page, /proyectosRead\/\?.*search=/)
    await page.goto(`/dashboard?q=${encodeURIComponent(codigo)}`)
    const datos = await (await lista).json()
    expect(datos.results.map((p: { proyect_ID: string }) => p.proyect_ID)).toEqual([proyecto.id])
    await page.goto(`/projects/${proyecto.id}`)
    await page.getByRole('tab', { name: /^Información/ }).click()
  })

  await test.step('un hito se agrega y se marca cumplido', async () => {
    const hitos = page.getByRole('region', { name: 'Hitos' })
    await hitos.getByLabel('Nombre del hito').fill('Orden de inicio')
    await hitos.getByLabel('Fecha prevista del hito').fill('2030-01-15')
    await hitos.getByRole('button', { name: 'Agregar hito' }).click()
    await expect(hitos).toContainText('Previsto el 15/01/2030')
    await hitos.getByRole('button', { name: 'Marcar cumplido: Orden de inicio' }).click()
    await expect(hitos).toContainText('1 de 1 cumplidos')
    await expect(hitos).toContainText('Cumplido el')
  })

  await test.step('un riesgo calcula su nivel', async () => {
    const riesgos = page.getByRole('region', { name: 'Riesgos' })
    await riesgos.getByRole('button', { name: 'Riesgo', exact: true }).click()
    const dialogo = page.getByRole('dialog', { name: 'Nuevo riesgo' })
    await dialogo.getByLabel('Qué puede pasar').fill('Lluvias que atrasen el colado')
    await dialogo.getByLabel('Probabilidad').selectOption({ label: 'Alta' })
    await dialogo.getByLabel('Impacto').selectOption({ label: 'Media' })
    await dialogo.getByLabel('Cómo se mitiga').fill('Colar en la mañana')
    await dialogo.getByRole('button', { name: 'Registrar riesgo' }).click()
    await expect(dialogo).toHaveCount(0)
    await expect(riesgos).toContainText('Nivel alto · 6/9')
    await expect(riesgos).toContainText('Mitigación: Colar en la mañana')
  })
})

// Agrega un tipo con nombre propio al catálogo: no cambia lo que ven las demás pruebas.
test('un tipo trae sus tareas: se arman en Configuración y se crean con el proyecto', { tag: '@muta' }, async ({ page, escenario }) => {
  const tipo = `Tipo ${escenario.run}`
  const nombre = `Acera ${escenario.run}`.slice(0, 50)
  await entrar(page)

  await test.step('en Configuración › Tipos: el tipo y sus dos tareas', async () => {
    await page.goto('/config')
    await page.getByRole('tab', { name: /^Tipos/ }).click()
    await page.getByLabel('Nuevo tipo...').fill(tipo)
    await page.getByRole('button', { name: 'Crear' }).click()
    await expect(page.getByText(tipo, { exact: true })).toBeVisible()
    const plantillas = page.getByRole('region', { name: 'Tareas que trae cada tipo' })
    await plantillas.getByLabel('Tipo', { exact: true }).selectOption({ label: `${tipo} (0)` })
    for (const [tarea, desde, pasos] of [['Demarcar', '0', 'Medir\nPintar'], ['Colar concreto', '5', '']]) {
      await plantillas.getByRole('button', { name: 'Agregar tarea' }).click()
      const dialogo = page.getByRole('dialog', { name: `Nueva tarea para «${tipo}»` })
      await dialogo.getByLabel('Nombre de la tarea').fill(tarea)
      await dialogo.getByLabel('Empieza a los … días del inicio').fill(desde)
      await dialogo.getByLabel('Pasos de la lista de verificación (uno por línea)').fill(pasos)
      await dialogo.getByRole('button', { name: 'Guardar' }).click()
      await expect(dialogo).toHaveCount(0)
    }
    await expect(plantillas.getByRole('listitem')).toHaveText([/Demarcar.*2 pasos/, /Colar concreto.*A los 5 días/])
  })

  await test.step('el asistente las ofrece y el proyecto nace con ellas', async () => {
    await page.goto('/projects/new')
    await page.getByLabel('Nombre del proyecto').fill(nombre)
    await page.getByLabel('Descripción').fill('Proyecto con plantilla')
    await page.getByLabel('Tipo de proyecto').selectOption({ label: tipo })
    await expect(page.getByLabel('Crear las 2 tareas de este tipo')).toBeChecked()
    await page.getByRole('button', { name: 'Siguiente' }).click()
    await page.getByLabel('Fecha inicio').fill('2030-03-01')
    await page.getByLabel('Fecha entrega').fill('2030-03-31')
    await page.getByLabel(/^Costo estimado/).fill('0')
    await page.getByRole('button', { name: 'Siguiente' }).click()
    await page.getByLabel('Departamento').selectOption({ label: 'Obras' })
    await page.getByLabel('Responsable').selectOption({ label: 'Ana Prueba' })
    const creado = esperarRespuesta(page, '/proyectosWrite/', 'POST')
    await page.getByRole('button', { name: 'Crear proyecto' }).click()
    const respuesta = await creado
    expect(respuesta.status()).toBe(201)
    await page.goto(`/projects/${(await respuesta.json()).proyect_ID}`)
    await expect(page.getByRole('button', { name: 'Demarcar', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Colar concreto', exact: true })).toBeVisible()
  })
})
