import { expect, type Page } from '@playwright/test'
import { readdirSync, readFileSync } from 'fs'
import path from 'path'

// Usuarios que siembra `manage.py datos_e2e` (solo existen en la base de pruebas).
export const CLAVE = 'Clave-E2E-2026'
export const ANA = 'ana@muni.test'      // Administrador
export const BETO = 'beto@muni.test'    // Funcionario (se usa para recuperar la contraseña)
export const FABI = 'fabi@muni.test'    // Funcionaria (sin permiso de crear proyectos por defecto)
export const JORGE = 'jorge@muni.test'  // Jefe del departamento de Obras (aprueba solicitudes)

export async function entrar(page: Page, email = ANA, clave = CLAVE, { aceptarAviso = true } = {}) {
  await page.goto('/login')
  await page.fill('input[type=email]', email)
  await page.fill('input[type=password]', clave)
  const login = page.waitForResponse(r => r.url().includes('/users/login/'))
  await page.click('button[type=submit]')
  const datos = await (await login).json()
  await page.waitForURL('**/dashboard')
  // Si una prueba publicó una versión nueva del aviso de privacidad, se acepta para seguir.
  if (datos.privacidad_pendiente && aceptarAviso) {
    await page.getByRole('dialog', { name: 'Aviso de privacidad' }).getByRole('button', { name: 'Leí el aviso y acepto' }).click()
    await expect(page.getByRole('dialog', { name: 'Aviso de privacidad' })).toHaveCount(0)
  }
}

/** El último enlace para definir la contraseña que mandó Django (backend de correo en archivos). */
export function ultimoEnlaceDeAcceso(): string {
  const dir = process.env.E2E_CORREOS!
  const archivos = readdirSync(dir).map(f => path.join(dir, f)).sort()
  const textos = archivos.map(f => readFileSync(f, 'utf8')).join('\n')
  const web = process.env.E2E_PUERTO_WEB ?? '5173'
  const enlaces = [...textos.matchAll(new RegExp(`http://localhost:${web}/definir-clave/[^\\s"<]+`, 'g'))].map(m => m[0])
  expect(enlaces.length, 'no llegó ningún correo con enlace').toBeGreaterThan(0)
  return enlaces[enlaces.length - 1]
}
