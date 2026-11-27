import { entrar, esperarRespuesta, expect, test } from '../fixtures'

// Cambia la configuración de la institución (y la deja como estaba): corre al final, de a una.
test('un cambio queda en la auditoría con el antes y el después, y la cadena se verifica', { tag: ['@global', '@critico'] }, async ({ page }) => {
  await entrar(page)
  await page.goto('/config')
  const horario = page.getByLabel('Horario', { exact: true })
  const original = await horario.inputValue()
  const guardar = async (valor: string) => {
    await horario.fill(valor)
    const respuesta = esperarRespuesta(page, '/configuracion/', 'PATCH')
    await page.getByRole('button', { name: 'Guardar' }).click()
    expect((await respuesta).status()).toBe(200)
  }
  await guardar('L-V 7:30–15:30')

  await page.goto('/auditoria')
  await page.getByLabel('Filtrar por módulo').selectOption('configuracion')
  const fila = page.getByRole('region', { name: 'Registros de auditoría' }).getByRole('row').nth(1)
  await expect(fila).toContainText('Editó')
  await fila.getByRole('button', { name: /Ver el detalle/ }).click()
  await expect(page.getByText('L-V 7:30–15:30')).toBeVisible()

  // Con dos workers escribiendo a la vez, la cadena tiene que seguir íntegra.
  await page.getByRole('button', { name: 'Verificar integridad' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'La cadena está íntegra' })).toBeVisible()

  await page.goto('/config')
  await guardar(original)
})

test('cerrar una sesión a distancia saca a la persona de la aplicación', { tag: ['@muta', '@critico'] }, async ({ page, browser, escenarioConPersona }) => {
  // Una persona propia: cerrarle las sesiones no saca de la app a las otras pruebas.
  const persona = escenarioConPersona.persona!
  await entrar(page, persona.email)

  const admin = await (await browser.newContext()).newPage()
  await entrar(admin)
  await admin.goto(`/users/${persona.id}`)
  await admin.getByRole('tab', { name: 'Actividad' }).click()
  const sesiones = admin.getByRole('region', { name: 'Sesiones' })
  await expect(sesiones.getByText('Abierta').first()).toBeVisible()
  await sesiones.getByRole('button', { name: 'Cerrar sesión' }).first().click()
  await admin.getByRole('dialog').getByRole('button', { name: 'Cerrar sesión' }).click()
  await expect(sesiones.getByRole('button', { name: 'Cerrar sesión' })).toHaveCount(0)

  // Sigue usando la app (sin recargar): la próxima petición la manda al login con el aviso.
  await page.getByRole('link', { name: 'Usuarios' }).click()
  await expect(page).toHaveURL(/\/login\?sesion=terminada/)
  await expect(page.getByText('Su sesión terminó')).toBeVisible()
})
