import { readFileSync } from 'fs'
import { DIRECCION_DE_PRUEBA, entrar, esperarRespuesta, expect, mapaCaido, test } from '../fixtures'

test('la ubicación se marca en la ficha y el portal la muestra con el presupuesto y el cierre', { tag: ['@muta', '@critico'] }, async ({ page, escenario }) => {
  const { proyecto } = escenario
  await entrar(page)
  await page.goto(`/projects/${proyecto.id}`)

  await test.step('se publica el proyecto', async () => {
    await page.getByRole('button', { name: 'Editar proyecto' }).click()
    const dialogo = page.getByRole('dialog', { name: 'Editar proyecto' })
    await dialogo.getByLabel('Mostrar en el portal público').check()
    const guardado = esperarRespuesta(page, `/proyectosWrite/${proyecto.id}/`, 'PATCH')
    await dialogo.getByRole('button', { name: 'Guardar cambios' }).click()
    expect((await guardado).ok()).toBe(true)
  })

  await test.step('en la ficha: buscar una dirección y ajustar el punto tocando el mapa', async () => {
    await page.getByRole('tab', { name: /^Información/ }).click()
    await page.getByRole('button', { name: 'Editar ficha' }).click()
    const ficha = page.getByRole('dialog', { name: 'Editar ficha' })
    await ficha.getByLabel('Buscar una dirección').fill('parque central')
    await ficha.getByRole('button', { name: 'Buscar' }).click()
    await ficha.getByRole('list', { name: 'Direcciones encontradas' }).getByRole('button', { name: DIRECCION_DE_PRUEBA.display_name }).click()
    await expect(ficha.getByLabel('Latitud')).toHaveValue('9.9333')
    await expect(ficha.getByLabel('Longitud')).toHaveValue('-84.08')
    const mapa = ficha.getByRole('region', { name: 'Mapa para marcar la ubicación del proyecto' })
    // Una latitud imposible (por ejemplo, sin el punto decimal) no tumba la pantalla: el mapa la ignora.
    await ficha.getByLabel('Latitud').fill('93')
    await page.waitForTimeout(300)
    await expect(mapa.locator('..')).toHaveAttribute('data-estado', 'listo')
    await ficha.getByLabel('Latitud').fill('9.9333')
    await mapa.scrollIntoViewIfNeeded()
    const caja = (await mapa.boundingBox())!
    // Al costado del centro: la longitud cambia (el mapa ya se movió hasta la dirección).
    await expect.poll(async () => {
      await mapa.click({ position: { x: caja.width / 2 + 60, y: caja.height / 2 } })
      return ficha.getByLabel('Longitud').inputValue()
    }).not.toBe('-84.08')
    await ficha.getByLabel('Latitud').fill('9.9325')
    await ficha.getByLabel('Longitud').fill('-84.0796')
    await ficha.getByLabel('N.º de SICOP').fill('2026LE-000777-0001')
    const guardado = esperarRespuesta(page, `/proyectosWrite/${proyecto.id}/`, 'PATCH')
    await ficha.getByRole('button', { name: 'Guardar ficha' }).click()
    expect((await guardado).ok()).toBe(true)
    await expect(page.getByRole('link', { name: /9\.9325, -84\.0796/ })).toBeVisible()
  })

  await test.step('se cancela: el formulario avisa qué se publica', async () => {
    await page.getByRole('button', { name: 'Cerrar proyecto' }).click()
    const cierre = page.getByRole('dialog', { name: 'Cerrar el proyecto' })
    await cierre.getByLabel('Cómo terminó').selectOption({ label: 'Cancelado' })
    await cierre.getByLabel('Costo real').fill('250000')
    const motivo = cierre.getByLabel('Resumen del cierre o motivo')
    await motivo.fill('No se consiguió el terreno.')
    await expect(motivo).toHaveAccessibleDescription(/el portal muestra este texto/)
    await cierre.getByLabel('Lecciones aprendidas (opcional)').fill('Interno: revisar antes el registro')
    const cerrado = esperarRespuesta(page, '/cerrar/')
    await cierre.getByRole('button', { name: 'Cerrar proyecto' }).click()
    expect((await cerrado).status()).toBe(201)
  })

  await test.step('el portal: filtro de cancelados, el mapa con su marcador y el detalle', async () => {
    await page.goto(`/publico`)
    const estado = page.getByLabel('Estado')
    await estado.selectOption({ label: 'Cancelados' })
    await expect(page.getByRole('heading', { name: proyecto.nombre })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Acera central' })).toHaveCount(0)
    await estado.selectOption({ label: 'En ejecución' })
    await expect(page.getByRole('heading', { name: 'Acera central' })).toBeVisible()
    await expect(page.getByRole('heading', { name: proyecto.nombre })).toHaveCount(0)
    await estado.selectOption({ label: 'Cancelados' })
    await page.getByRole('button', { name: 'Mapa' }).click()
    await expect(page.getByRole('button', { name: 'Mapa' })).toHaveAttribute('aria-pressed', 'true')
    const marcador = page.getByRole('region', { name: 'Mapa de los proyectos' }).getByRole('button', { name: new RegExp(`^${proyecto.nombre}: Cancelado`) })
    await marcador.click()
    await page.getByRole('link', { name: 'Ver el proyecto' }).click()
    await expect(page).toHaveURL(new RegExp(`/publico/proyectos/${proyecto.id}$`))

    const motivo = page.getByRole('region', { name: 'Motivo de la cancelación' })
    await expect(motivo).toContainText('No se consiguió el terreno.')
    await expect(motivo).toContainText('Costo final')
    await expect(page.getByRole('region', { name: 'Presupuesto y ejecución' })).toContainText('Presupuesto aprobado')
    await expect(page.getByText('2026LE-000777-0001')).toBeVisible()
    await expect(page.getByRole('region', { name: `Ubicación de ${proyecto.nombre}` })).toBeVisible()
    await expect(page.getByText(/Información actualizada el/)).toBeVisible()
    const texto = await page.locator('body').innerText()
    expect(texto).not.toContain('Interno: revisar')
  })

  await test.step('cerrado, se quita del portal sin reabrirlo', async () => {
    await page.goto(`/projects/${proyecto.id}`)
    await expect(page.getByRole('button', { name: 'Editar proyecto' })).toHaveCount(0)
    await page.getByRole('button', { name: 'Quitar del portal' }).click()
    const quitado = esperarRespuesta(page, '/despublicar/')
    await page.getByRole('dialog').getByRole('button', { name: 'Quitar del portal' }).click()
    expect((await quitado).ok()).toBe(true)
    await expect(page.getByRole('button', { name: 'Quitar del portal' })).toHaveCount(0)
    await page.goto(`/publico/proyectos/${proyecto.id}`)
    await expect(page.getByRole('heading', { name: 'Este proyecto no existe o no es público' })).toBeVisible()
  })
})

test('si el mapa no carga, el portal lo avisa y la lista sigue', { tag: '@lectura' }, async ({ page }) => {
  await mapaCaido(page)
  await page.goto('/publico')
  await page.getByRole('button', { name: 'Mapa' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'El mapa no está disponible en este momento' })).toBeVisible()
  await page.getByRole('button', { name: 'Tarjetas' }).click()
  await expect(page.getByRole('heading', { name: 'Acera central' })).toBeVisible()
})

test('los datos abiertos se descargan en CSV y JSON con la licencia', { tag: '@lectura' }, async ({ page, request }) => {
  await page.goto('/publico')
  const seccion = page.getByRole('region', { name: 'Datos abiertos' })
  await expect(seccion.getByRole('link', { name: /CC BY 4.0|CC0 1.0|ODbL 1.0/ })).toBeVisible()
  const descarga = page.waitForEvent('download')
  await seccion.getByRole('link', { name: 'Descargar en CSV' }).click()
  const archivo = await descarga
  expect(archivo.suggestedFilename()).toBe('proyectos.csv')
  const csv = readFileSync((await archivo.path())!, 'utf8')
  expect(csv.split('\n')[0]).toContain('presupuesto_aprobado')
  expect(csv).toContain('Acera central')
  expect(csv).not.toContain('Plan interno')

  const json = await (await request.get('/api/v1/public/datos/proyectos.json')).json()
  expect(json.licencia).toBeTruthy()
  expect(json.proyectos.map((p: { nombre: string }) => p.nombre)).toContain('Acera central')
})
