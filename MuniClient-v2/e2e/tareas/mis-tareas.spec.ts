import { FABI, entrar, expect, test } from '../fixtures'

test('«Mis tareas» junta las abiertas de todos los proyectos y abre cada una en su proyecto', { tag: '@lectura' }, async ({ page, escenario }) => {
  const { proyecto } = escenario
  await entrar(page, FABI)
  await page.getByRole('link', { name: 'Mis tareas' }).click()
  await expect(page.getByRole('heading', { name: 'Mis tareas' })).toBeVisible()
  const delEscenario = page.getByRole('listitem').filter({ hasText: proyecto.nombre })
  // Las cinco del escenario son de Fabi; «Comprar cemento» está completada y no se muestra.
  await expect(delEscenario).toHaveCount(4)
  await expect(delEscenario.filter({ hasText: 'Comprar cemento' })).toHaveCount(0)
  await expect(page.getByRole('region', { name: /En los próximos 7 días/ }).getByRole('link', { name: 'Demarcar' }).first()).toBeVisible()

  await delEscenario.getByRole('link', { name: 'Excavar' }).click()
  await expect(page).toHaveURL(new RegExp(`/projects/${proyecto.id}\\?tarea=`))
  await expect(page.getByRole('dialog', { name: 'Tarea: Excavar' })).toBeVisible()
})

test.describe('en el celular', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  test('la barra inferior lleva a lo de todos los días y «Más» abre el resto', { tag: '@lectura' }, async ({ page }) => {
    await entrar(page, FABI)
    const barra = page.getByRole('navigation', { name: 'Accesos principales' })
    await expect(barra).toBeVisible()
    await expect(barra.getByRole('link', { name: 'Proyectos' })).toHaveAttribute('aria-current', 'page')
    await barra.getByRole('link', { name: 'Mis tareas' }).click()
    await expect(page).toHaveURL(/\/mis-tareas$/)
    await expect(barra.getByRole('link', { name: 'Mis tareas' })).toHaveAttribute('aria-current', 'page')
    await barra.getByRole('link', { name: 'Solicitudes' }).click()
    await expect(page).toHaveURL(/\/solicitudes$/)

    await barra.getByRole('button', { name: /^Avisos/ }).click()
    await expect(barra.getByRole('button', { name: /^Avisos/ })).toHaveAttribute('aria-expanded', 'true')
    await page.keyboard.press('Escape')

    await barra.getByRole('button', { name: 'Más' }).click()
    const menu = page.getByRole('dialog', { name: 'Menú' })
    await expect(menu).toBeVisible()
    await menu.getByRole('link', { name: 'Cronograma' }).click()
    await expect(page).toHaveURL(/\/timeline$/)
    await expect(menu).toHaveCount(0)
    // La campana del encabezado no se repite: en el celular los avisos están abajo.
    await expect(page.getByRole('banner').getByRole('button')).toHaveCount(0)
  })
})
