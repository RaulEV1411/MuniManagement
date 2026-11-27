import { entrar, esperarRespuesta, expect, test } from '../fixtures'

const local = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const conBarras = (iso: string) => iso.split('-').reverse().join('/')

// Todo sobre una persona propia (escenarioConPersona) y una especialidad con nombre propio: no cambia lo que ven las demás pruebas.
test('datos de empleado, especialidades, ausencia con sugerencia de delegar y carga', { tag: '@muta' }, async ({ page, escenarioConPersona: e }) => {
  const persona = e.persona!
  const especialidad = `Topografía ${e.run}`
  const hoy = local(new Date())
  const enDosDias = local(new Date(Date.now() + 2 * 86_400_000))
  await entrar(page)

  await test.step('una especialidad nueva en Configuración', async () => {
    await page.goto('/config')
    await page.getByRole('tab', { name: /^Especialidades/ }).click()
    await page.getByLabel('Nueva especialidad (topografía, electricidad…)').fill(especialidad)
    await page.getByRole('button', { name: 'Crear' }).click()
    await expect(page.getByText(especialidad, { exact: true })).toBeVisible()
  })

  await test.step('la persona queda a cargo del proyecto del escenario', async () => {
    await page.goto(`/projects/${e.proyecto.id}`)
    await page.getByRole('button', { name: 'Editar proyecto' }).click()
    await page.getByRole('dialog').getByLabel('Responsable').selectOption({ label: persona.nombre })
    const guardado = esperarRespuesta(page, `/proyectosWrite/${e.proyecto.id}/`, 'PATCH')
    await page.getByRole('dialog').getByRole('button', { name: 'Guardar cambios' }).click()
    expect((await guardado).status()).toBe(200)
  })

  await test.step('número de empleado, extensión y especialidad en el perfil', async () => {
    await page.goto(`/users/${persona.id}`)
    await page.getByRole('button', { name: 'Editar', exact: true }).click()
    const dialogo = page.getByRole('dialog', { name: 'Editar usuario' })
    await dialogo.getByLabel('N.º de empleado').fill(`E-${e.run}`)
    await dialogo.getByLabel('Extensión').fill('214')
    await dialogo.getByLabel(especialidad).check()
    await dialogo.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(dialogo).toHaveCount(0)
    await expect(page.getByText(`E-${e.run}`)).toBeVisible()
    await expect(page.getByRole('listitem').filter({ hasText: especialidad })).toBeVisible()
  })

  await test.step('una ausencia: el aviso de delegar, la disponibilidad y la carga', async () => {
    const panel = page.getByRole('region', { name: 'Disponibilidad y carga' })
    await expect(panel.getByText('Disponible', { exact: true })).toBeVisible()
    await panel.getByLabel('Tipo de ausencia').selectOption({ label: 'Permiso' })
    await panel.getByLabel('Desde').fill(hoy)
    await panel.getByLabel('Hasta').fill(enDosDias)
    const creada = esperarRespuesta(page, '/users/ausencias/', 'POST')
    await panel.getByRole('button', { name: 'Registrar ausencia' }).click()
    expect((await creada).status()).toBe(201)
    const aviso = panel.getByRole('status')
    await expect(aviso).toContainText('Conviene delegar su proyecto a cargo')
    await expect(aviso.getByRole('link', { name: e.proyecto.nombre })).toHaveAttribute('href', `/projects/${e.proyecto.id}`)
    await expect(panel.getByText(`Permiso hasta el ${conBarras(enDosDias)}`)).toBeVisible()
    await expect(panel.getByText('Permiso · en curso')).toBeVisible()
    await expect(panel.getByRole('definition').nth(3)).toHaveText('1')  // proyectos a cargo
  })

  await test.step('la lista de usuarios y el selector de tareas muestran la ausencia', async () => {
    await page.goto('/users')
    await page.getByLabel('Buscar usuarios').fill(persona.nombre)
    await expect(page.getByRole('link', { name: persona.nombre })).toHaveCount(1)
    await expect(page.getByText(`Permiso hasta el ${conBarras(enDosDias)}`)).toBeVisible()
    await page.goto(`/projects/${e.proyecto.id}`)
    await page.getByRole('button', { name: 'Nueva tarea' }).first().click()
    const opcion = page.getByRole('dialog', { name: 'Nueva tarea' }).getByLabel('Asignado a').locator('option', { hasText: persona.nombre })
    await expect(opcion).toHaveText(`${persona.nombre} · Permiso hasta el ${conBarras(enDosDias)} · 0 tareas abiertas · ${especialidad}`)
  })
})

test('los datos de un departamento: código y metas', { tag: '@muta' }, async ({ page }) => {
  await entrar(page)
  await page.goto('/departments')
  await page.getByRole('button', { name: 'Más datos de Obras' }).click()
  const dialogo = page.getByRole('dialog', { name: 'Datos de Obras' })
  await dialogo.getByLabel('Código').fill('OBR')
  await dialogo.getByLabel('Metas del año (una por línea)').fill('Asfaltar 5 km\nDemarcar 20 pasos peatonales')
  const guardado = esperarRespuesta(page, /\/departments\/departamentos\/.+\//, 'PATCH')
  await dialogo.getByRole('button', { name: 'Guardar datos' }).click()
  expect((await guardado).status()).toBe(200)
  await expect(dialogo).toHaveCount(0)
  await page.reload()
  await page.getByRole('button', { name: 'Más datos de Obras' }).click()
  await expect(page.getByRole('dialog', { name: 'Datos de Obras' }).getByLabel('Metas del año (una por línea)'))
    .toHaveValue('Asfaltar 5 km\nDemarcar 20 pasos peatonales')
})
