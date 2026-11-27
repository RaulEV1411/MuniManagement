import { entrar, expect, test } from '../fixtures'

// Fecha local (no UTC) a n días de hoy, como la pide el campo de fecha.
const dia = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

test('el cronograma marca los hitos y el resumen se abre con el puntero y con el teclado', { tag: '@muta' }, async ({ page, escenario }) => {
  const { proyecto } = escenario
  await entrar(page)
  await page.goto(`/projects/${proyecto.id}`)
  await page.getByRole('tab', { name: /^Información/ }).click()
  const hitos = page.getByRole('region', { name: 'Hitos' })
  for (const [nombre, n] of [['Estudio de suelos', -5], ['Permisos', -3], ['Orden de inicio', 5]] as const) {
    await hitos.getByLabel('Nombre del hito').fill(nombre)
    await hitos.getByLabel('Fecha prevista del hito').fill(dia(n))
    await hitos.getByRole('button', { name: 'Agregar hito' }).click()
    await expect(hitos).toContainText(nombre)
  }
  await hitos.getByRole('button', { name: 'Marcar cumplido: Estudio de suelos' }).click()
  await expect(hitos).toContainText('1 de 3 cumplidos')

  await test.step('cronograma: un rombo por hito y el resumen con el puntero', async () => {
    await page.goto('/timeline')
    const enlace = page.getByRole('link', { name: proyecto.nombre, exact: true })
    const fila = page.locator('div.group', { has: enlace })
    await expect(fila.locator('[data-hito="cumplido"]')).toHaveCount(1)
    await expect(fila.locator('[data-hito="atrasado"]')).toHaveCount(1)
    await expect(fila.locator('[data-hito="previsto"]')).toHaveCount(1)
    await enlace.hover()
    const resumen = page.getByRole('tooltip')
    await expect(resumen).toBeVisible()
    await expect(resumen).toContainText(proyecto.nombre)
    for (const texto of ['Avance', 'Responsable', 'Presupuesto', 'Solicitudes', 'Ninguna abierta', 'Estudio de suelos: cumplido el', 'Permisos: atrasado, era el', 'Orden de inicio: previsto el']) {
      await expect(resumen).toContainText(texto)
    }
    // Se puede pasar el puntero al tooltip sin que se cierre (WCAG 1.4.13).
    await resumen.hover()
    await expect(resumen).toBeVisible()
    // Y volver a la barra tampoco lo cierra (el cierre demora 120 ms: se espera más que eso).
    await enlace.hover()
    await page.waitForTimeout(400)
    await expect(resumen).toBeVisible()
    await page.mouse.move(2, 2)
    await expect(page.getByRole('tooltip')).toHaveCount(0)
  })

  await test.step('cronograma: con el teclado, el resumen es la descripción del enlace y Escape lo cierra', async () => {
    const enlace = page.getByRole('link', { name: proyecto.nombre, exact: true })
    await enlace.focus()
    await expect(page.getByRole('tooltip')).toBeVisible()
    await expect(enlace).toHaveAccessibleDescription(/Avance.*Presupuesto.*Solicitudes/)
    await page.keyboard.press('Escape')
    await expect(page.getByRole('tooltip')).toHaveCount(0)
    await expect(enlace).toBeFocused()
  })

  await test.step('reportes: el nombre lleva al proyecto y muestra el resumen', async () => {
    await page.goto('/reports')
    await page.getByLabel('Buscar proyecto').fill(proyecto.nombre)
    const enlace = page.getByRole('link', { name: proyecto.nombre, exact: true })
    await enlace.focus()
    await expect(page.getByRole('tooltip')).toContainText('Presupuesto')
    await enlace.press('Enter')
    await expect(page).toHaveURL(new RegExp(`/projects/${proyecto.id}`))
  })
})
