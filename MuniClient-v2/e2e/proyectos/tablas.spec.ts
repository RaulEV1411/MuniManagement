import { entrar, esperarRespuesta, expect, test } from '../fixtures'

test.beforeEach(async ({ page }) => {
  await entrar(page)
})

test('la tabla de proyectos ordena en el servidor, elige columnas y tamaño de página', { tag: '@lectura' }, async ({ page }) => {
  await page.goto('/dashboard')
  const tabla = page.getByRole('table', { name: 'Proyectos' })
  await expect(tabla.getByRole('link', { name: 'Acera central' })).toBeVisible()
  const avance = tabla.getByRole('columnheader', { name: 'Avance' })

  const ascendente = esperarRespuesta(page, /proyectosRead\/\?.*orden=avance(&|$)/)
  await avance.getByRole('button').click()
  await ascendente
  await expect(avance).toHaveAttribute('aria-sort', 'ascending')
  const descendente = esperarRespuesta(page, /proyectosRead\/\?.*orden=-avance/)
  await avance.getByRole('button').click()
  await descendente
  await expect(avance).toHaveAttribute('aria-sort', 'descending')
  await expect(page.getByLabel('Ordenar')).toHaveValue('-avance')
  // De mayor a menor avance (la base es compartida con otras pruebas: se mira el orden, no quién va primero).
  const avances = (await tabla.locator('tbody tr').allInnerTexts()).map(t => Number(/(\d+)\s%/.exec(t)?.[1]))
  expect(avances.length).toBeGreaterThan(1)
  expect(avances).toEqual([...avances].sort((a, b) => b - a))

  // Columnas a elección; la elección queda guardada en este navegador.
  await expect(tabla.getByRole('columnheader', { name: 'Código' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Columnas' }).click()
  await page.getByRole('checkbox', { name: 'Código' }).check()
  await page.getByRole('checkbox', { name: 'Departamento' }).uncheck()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('checkbox', { name: 'Código' })).toBeHidden()
  await expect(page.getByRole('button', { name: 'Columnas' })).toBeFocused()
  await page.reload()
  await expect(tabla.getByRole('columnheader', { name: 'Código' })).toBeVisible()
  await expect(tabla.getByRole('columnheader', { name: 'Departamento' })).toHaveCount(0)
  await expect(tabla.getByRole('columnheader', { name: 'Nombre' })).toBeVisible()

  // El cambio rápido de estado se usa con el teclado: el foco entra al menú (va en un portal) y vuelve al cerrar.
  const estado = tabla.getByTitle('Cambiar estado').first()
  await estado.focus()
  await page.keyboard.press('Enter')
  const actual = page.locator('button[aria-current="true"]')
  await expect(actual).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(actual).not.toBeFocused()
  await page.keyboard.press('Escape')
  await expect(actual).toHaveCount(0)
  await expect(estado).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(actual).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(actual).toHaveCount(0)

  const de50 = esperarRespuesta(page, /proyectosRead\/\?.*page_size=50/)
  await page.getByLabel('Por página').selectOption('50')
  await de50
  await expect(page).toHaveURL(/por=50/)
})

test('la tabla de usuarios ordena por columna y en el celular pasa a tarjetas', { tag: '@lectura' }, async ({ page }) => {
  await page.goto('/users')
  const tabla = page.getByRole('table', { name: 'Usuarios' })
  await expect(tabla.getByRole('link', { name: 'Ana Prueba' })).toBeVisible()
  await expect(tabla.getByRole('columnheader', { name: 'Nombre' })).toHaveAttribute('aria-sort', 'ascending')

  const porCorreo = esperarRespuesta(page, /users\/\?.*orden=correo/)
  await tabla.getByRole('button', { name: 'Correo' }).click()
  await porCorreo
  await expect(tabla.getByRole('columnheader', { name: 'Correo' })).toHaveAttribute('aria-sort', 'ascending')
  // Última conexión: lo más reciente primero en el primer clic.
  const porConexion = esperarRespuesta(page, /users\/\?.*orden=-conexion/)
  await tabla.getByRole('button', { name: 'Última conexión' }).click()
  await porConexion
  await expect(tabla.getByRole('columnheader', { name: 'Última conexión' })).toHaveAttribute('aria-sort', 'descending')
  // Quien recién entró tiene conexión; las cuentas sin conexiones van al final (otras pruebas también entran: se mira el orden).
  const filas = (await tabla.locator('tbody tr').allInnerTexts()).map(t => t.includes('Sin conexiones'))
  expect(filas[0]).toBe(false)
  expect(filas).toEqual([...filas].sort((a, b) => Number(a) - Number(b)))

  await page.setViewportSize({ width: 390, height: 844 })
  await expect(tabla).toHaveCount(0)
  await expect(page.getByRole('list', { name: 'Usuarios' }).getByRole('link', { name: 'Ana Prueba' })).toBeVisible()
})
