import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import { entrar, expect, test } from '../fixtures'

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
  // Los avisos (sonner) entran y salen con transiciones que pueden empezar después: si axe los
  // agarra a media opacidad, informa un contraste que en realidad no existe (pasaba en el CI, más lento).
  await page.waitForFunction(() => [...document.querySelectorAll<HTMLElement>('[data-sonner-toast]')]
    .filter(t => t.dataset.visible !== 'false')
    .every(t => getComputedStyle(t).opacity === '1'))
  // framer-motion anima por JS con opacidad en línea: se espera a que ningún elemento quede a medias
  // (pasaba con las filas de Usuarios cuando la lista se redibuja al llegar un dato después).
  await page.waitForFunction(() => [...document.querySelectorAll<HTMLElement>('[style*="opacity"]')]
    .every(e => { const o = parseFloat(e.style.opacity); return Number.isNaN(o) || o === 0 || o === 1 }))
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
  test.describe(`modo ${tema}`, { tag: '@a11y' }, () => {
    test.use({ colorScheme: tema === 'oscuro' ? 'dark' : 'light', reducedMotion: 'reduce' })
    test.beforeEach(async ({ page }) => {
      if (tema === 'oscuro') {
        await page.addInitScript(() => localStorage.setItem('muni-app', JSON.stringify({ state: { isDark: true }, version: 0 })))
      }
    })

    test('páginas públicas', async ({ page }) => {
      test.setTimeout(120_000)
      for (const ruta of ['/login', '/login?sesion=terminada', '/olvide-clave', '/publico', '/accesibilidad', '/privacidad']) {
        await page.goto(ruta)
        await sinFallos(page, ruta)
      }
      await page.goto('/publico')
      await page.getByRole('heading', { name: 'Acera central' }).click()
      await expect(page.getByText('Tareas del proyecto')).toBeVisible()
      await sinFallos(page, 'detalle público')
    })

    // Las pantallas internas, por área: cada prueba entra por su cuenta, así se reparten entre los workers
    // y una falla dice en qué módulo está.
    test('proyectos: vistas, pestañas, cronograma y reportes', async ({ page }) => {
      test.setTimeout(150_000)
      await entrar(page)
      for (const vista of ['Vista de lista', 'Vista de cuadrícula', 'Vista de tablero']) {
        await page.getByRole('button', { name: vista }).click()
        await sinFallos(page, `proyectos · ${vista}`)
      }
      for (const ruta of ['/projects/new', '/timeline', '/reports', '/solicitudes']) {
        await page.goto(ruta)
        await sinFallos(page, ruta)
      }
      await page.goto('/dashboard')
      await page.getByRole('link', { name: 'Acera central' }).first().click()
      for (const pestana of ['Tareas', 'Información', 'Solicitudes', 'Documentos', 'Fotos', 'Comentarios', 'Actividad']) {
        await page.getByRole('tab', { name: new RegExp(`^${pestana}`) }).click()
        await sinFallos(page, `proyecto · ${pestana}`)
      }
    })

    test('usuarios, perfil y estructura', async ({ page }) => {
      test.setTimeout(150_000)
      await entrar(page)
      for (const ruta of ['/users/new', '/directions', '/departments', '/ayuda', '/auditoria']) {
        await page.goto(ruta)
        await sinFallos(page, ruta)
      }
      await page.goto('/departments')
      await page.getByRole('button', { name: 'Más datos de Obras' }).click()
      await expect(page.getByRole('dialog', { name: 'Datos de Obras' })).toBeVisible()
      await sinFallos(page, 'datos del departamento', '[role=dialog]')
      await page.keyboard.press('Escape')
      await page.goto('/users')
      await sinFallos(page, '/users')
      await page.getByRole('button', { name: 'Vista de cuadrícula' }).click()
      await sinFallos(page, 'usuarios · cuadrícula')
      await page.getByRole('link', { name: 'Beto Prueba' }).click()
      await sinFallos(page, 'perfil')
      await page.getByRole('tab', { name: 'Actividad' }).click()
      await expect(page.getByRole('heading', { name: 'Sesiones' })).toBeVisible()
      await sinFallos(page, 'perfil · actividad')
    })

    test('configuración', async ({ page }) => {
      test.setTimeout(150_000)
      await entrar(page)
      await page.goto('/config')
      for (const pestana of ['Institución', 'Privacidad', 'Estados', 'Prioridades', 'Tipos', 'Financiamiento', 'Especialidades', 'Recursos', 'Solicitudes', 'Roles y permisos']) {
        await page.getByRole('tab', { name: new RegExp(`^${pestana}`) }).click()
        await sinFallos(page, `configuración · ${pestana}`)
      }
    })

    test('diálogos abiertos', async ({ page }) => {
      test.setTimeout(120_000)
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
      await page.keyboard.press('Escape')

      await page.getByRole('tab', { name: /^Información/ }).click()
      await page.getByRole('button', { name: 'Agregar persona' }).click()
      await expect(page.getByRole('dialog', { name: 'Agregar al equipo' })).toBeVisible()
      await sinFallos(page, 'agregar al equipo', '[role=dialog]')
      await page.keyboard.press('Escape')

      await page.getByRole('button', { name: 'Editar ficha' }).click()
      await expect(page.getByRole('dialog', { name: 'Editar ficha' })).toBeVisible()
      await sinFallos(page, 'editar ficha', '[role=dialog]')
      await page.keyboard.press('Escape')

      await page.getByRole('region', { name: 'Riesgos' }).getByRole('button', { name: 'Riesgo', exact: true }).click()
      await expect(page.getByRole('dialog', { name: 'Nuevo riesgo' })).toBeVisible()
      await sinFallos(page, 'nuevo riesgo', '[role=dialog]')
      await page.keyboard.press('Escape')

      await page.getByRole('button', { name: 'Cerrar proyecto' }).click()
      await expect(page.getByRole('dialog', { name: 'Cerrar el proyecto' })).toBeVisible()
      await sinFallos(page, 'cerrar el proyecto', '[role=dialog]')
      await page.keyboard.press('Escape')

      await page.getByRole('tab', { name: /^Solicitudes/ }).click()
      await sinFallos(page, 'solicitudes del proyecto')
      await page.getByRole('button', { name: 'Nueva solicitud' }).click()
      await expect(page.getByRole('dialog', { name: 'Nueva solicitud' })).toBeVisible()
      await sinFallos(page, 'nueva solicitud', '[role=dialog]')
      await page.keyboard.press('Escape')

      await page.getByRole('tab', { name: /^Tareas/ }).click()
      await page.getByRole('button', { name: 'Excavar', exact: true }).click()
      await expect(page.getByRole('dialog', { name: 'Tarea: Excavar' })).toBeVisible()
      await sinFallos(page, 'detalle de tarea', '[role=dialog]')
      await page.keyboard.press('Escape')
      await page.getByRole('tab', { name: /^Tareas/ }).click()

      // La confirmación de borrado es un diálogo propio (antes window.confirm); Escape cancela.
      await page.getByRole('button', { name: /^Eliminar la tarea/ }).first().click()
      const confirmacion = page.getByRole('dialog', { name: /^¿Eliminar la tarea/ })
      await expect(confirmacion).toBeVisible()
      await expect(confirmacion.getByRole('button', { name: 'Cancelar' })).toBeFocused()
      await sinFallos(page, 'confirmación', '[role=dialog]')
      await page.keyboard.press('Escape')
      await expect(confirmacion).toHaveCount(0)
    })
  })
}

test('se usa con el teclado: saltar el menú, abrir un proyecto, pestañas y diálogos', { tag: '@a11y' }, async ({ page }) => {
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

test.describe('en el celular', { tag: '@a11y' }, () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  test('el menú es un cajón, nada se corta a lo ancho y pasa axe', async ({ page }) => {
    test.setTimeout(90_000)
    await entrar(page)
    await expect(page.getByRole('link', { name: 'Acera central' }).first()).toBeVisible()
    // El menú lateral no ocupa la pantalla: queda en el cajón.
    await expect(page.getByRole('link', { name: 'Configuración' })).toBeHidden()

    await page.getByRole('button', { name: 'Abrir el menú' }).click()
    const menu = page.getByRole('dialog', { name: 'Menú' })
    await expect(menu).toBeVisible()
    await menu.getByRole('link', { name: 'Usuarios' }).click()
    await page.waitForURL('**/users')
    await expect(menu).toHaveCount(0)

    for (const ruta of ['/dashboard', '/users', '/reports', '/timeline', '/config', '/auditoria']) {
      await page.goto(ruta)
      await sinFallos(page, `celular · ${ruta}`)
      const ancho = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
      expect(ancho, `${ruta} se sale a lo ancho`).toBeLessThanOrEqual(0)
    }
    await page.goto('/dashboard')
    await page.getByRole('link', { name: 'Acera central' }).first().click()
    await sinFallos(page, 'celular · proyecto')
  })
})
