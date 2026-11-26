import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { entrar } from './ayuda'

// WCAG 2.2 AA con axe-core: ninguna página principal puede tener fallos, en modo claro ni oscuro.
const NORMAS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

// Las entradas animadas pasan por opacidades intermedias: se analiza cuando terminan. Las de CSS se
// esperan con getAnimations; las de framer-motion corren por JS (duran 0,35 s como mucho).
async function esperarAnimaciones(page: Page) {
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => Promise.all(document.getAnimations()
    .filter(a => a.effect?.getComputedTiming().endTime !== Infinity)
    .map(a => a.finished.catch(() => undefined))))
  await page.waitForTimeout(500)
}

/** Con un diálogo abierto se analiza solo el diálogo: lo de atrás queda tapado e inactivo. */
async function sinFallos(page: Page, que: string, dentroDe?: string) {
  await esperarAnimaciones(page)
  const axe = new AxeBuilder({ page }).withTags(NORMAS)
  if (dentroDe) axe.include(dentroDe)
  const { violations } = await axe.analyze()
  const resumen = violations.map(v => `${v.id}: ${v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | ')}`)
  expect(resumen, `fallos de accesibilidad en ${que}`).toEqual([])
}

for (const tema of ['claro', 'oscuro'] as const) {
  test.describe(`modo ${tema}`, () => {
    test.use({ colorScheme: tema === 'oscuro' ? 'dark' : 'light', reducedMotion: 'reduce' })
    test.beforeEach(async ({ page }) => {
      if (tema === 'oscuro') {
        await page.addInitScript(() => localStorage.setItem('muni-app', JSON.stringify({ state: { isDark: true }, version: 0 })))
      }
    })

    test('páginas públicas', async ({ page }) => {
      for (const ruta of ['/login', '/olvide-clave', '/publico', '/accesibilidad']) {
        await page.goto(ruta)
        await sinFallos(page, ruta)
      }
      await page.goto('/publico')
      await page.getByRole('heading', { name: 'Acera central' }).click()
      await expect(page.getByText('Tareas del proyecto')).toBeVisible()
      await sinFallos(page, 'detalle público')
    })

    test('pantallas internas, vistas y pestañas', async ({ page }) => {
      test.setTimeout(150_000)
      await entrar(page)
      for (const vista of ['Vista de lista', 'Vista de cuadrícula', 'Vista de tablero']) {
        await page.getByRole('button', { name: vista }).click()
        await sinFallos(page, `proyectos · ${vista}`)
      }
      for (const ruta of ['/projects/new', '/users', '/users/new', '/directions', '/departments', '/timeline', '/reports', '/ayuda']) {
        await page.goto(ruta)
        await sinFallos(page, ruta)
      }
      await page.goto('/users')
      await page.getByRole('button', { name: 'Vista de cuadrícula' }).click()
      await sinFallos(page, 'usuarios · cuadrícula')
      await page.getByRole('link', { name: 'Beto Prueba' }).click()
      await sinFallos(page, 'perfil')

      await page.goto('/config')
      for (const pestana of ['Institución', 'Estados', 'Prioridades', 'Tipos']) {
        await page.getByRole('tab', { name: new RegExp(`^${pestana}`) }).click()
        await sinFallos(page, `configuración · ${pestana}`)
      }

      await page.goto('/dashboard')
      await page.getByRole('link', { name: 'Acera central' }).first().click()
      for (const pestana of ['Tareas', 'Información', 'Fotos', 'Comentarios', 'Actividad']) {
        await page.getByRole('tab', { name: new RegExp(`^${pestana}`) }).click()
        await sinFallos(page, `proyecto · ${pestana}`)
      }
    })

    test('diálogos abiertos', async ({ page }) => {
      test.setTimeout(60_000)
      await entrar(page)
      await page.getByText('Buscar...').click()
      await expect(page.getByRole('dialog', { name: 'Buscar proyectos y usuarios' })).toBeVisible()
      await sinFallos(page, 'búsqueda', '[role=dialog]')
      await page.keyboard.press('Escape')

      await page.goto('/directions')
      await page.getByRole('button', { name: /nueva dirección/i }).click()
      await expect(page.getByRole('dialog', { name: 'Nueva dirección' })).toBeVisible()
      await sinFallos(page, 'nueva dirección', '[role=dialog]')
      await page.keyboard.press('Escape')

      await page.goto('/dashboard')
      await page.getByRole('link', { name: 'Acera central' }).first().click()
      await page.getByRole('button', { name: 'Editar proyecto' }).click()
      await expect(page.getByRole('dialog', { name: 'Editar proyecto' })).toBeVisible()
      await sinFallos(page, 'editar proyecto', '[role=dialog]')
    })
  })
}

test('se usa con el teclado: saltar el menú, abrir un proyecto, pestañas y diálogos', async ({ page }) => {
  await entrar(page)
  await expect(page.getByRole('link', { name: 'Acera central' }).first()).toBeVisible()

  // El primer Tab ofrece saltar el menú y lleva el foco al contenido.
  await page.keyboard.press('Tab')
  const saltar = page.getByRole('link', { name: 'Saltar al contenido' })
  await expect(saltar).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('#contenido')).toBeFocused()

  // Un proyecto se abre con Enter desde su enlace (antes era un div con clic).
  await page.getByRole('link', { name: 'Acera central' }).first().focus()
  await page.keyboard.press('Enter')
  await page.waitForURL('**/projects/*')

  // Las flechas cambian de pestaña.
  const tareas = page.getByRole('tab', { name: /^Tareas/ })
  await tareas.focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('tab', { name: /^Información/ })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('tab', { name: /^Información/ })).toBeFocused()

  // El diálogo atrapa el foco, Escape lo cierra y el foco vuelve al botón que lo abrió.
  const editar = page.getByRole('button', { name: 'Editar proyecto' })
  await editar.focus()
  await page.keyboard.press('Enter')
  const dialogo = page.getByRole('dialog', { name: 'Editar proyecto' })
  await expect(dialogo).toBeVisible()
  await expect(dialogo.getByLabel('Nombre')).toBeFocused()
  for (let i = 0; i < 25; i++) await page.keyboard.press('Tab')
  expect(await dialogo.evaluate(d => d.contains(document.activeElement))).toBe(true)
  await page.keyboard.press('Escape')
  await expect(dialogo).toHaveCount(0)
  await expect(editar).toBeFocused()
})
