import { expect, type Page } from '@playwright/test'
import { readdirSync, readFileSync } from 'fs'
import path from 'path'

// Usuarios que siembra `manage.py datos_e2e` (solo existen en la base de pruebas).
export const CLAVE = 'Clave-E2E-2026'
export const ANA = 'ana@muni.test'      // Administrador
export const BETO = 'beto@muni.test'    // Funcionario (se usa para recuperar la contraseña)

export async function entrar(page: Page, email = ANA, clave = CLAVE) {
  await page.goto('/login')
  await page.fill('input[type=email]', email)
  await page.fill('input[type=password]', clave)
  await page.click('button[type=submit]')
  await page.waitForURL('**/dashboard')
}

/** El último enlace para definir la contraseña que mandó Django (backend de correo en archivos). */
export function ultimoEnlaceDeAcceso(): string {
  const dir = process.env.E2E_CORREOS!
  const archivos = readdirSync(dir).map(f => path.join(dir, f)).sort()
  const textos = archivos.map(f => readFileSync(f, 'utf8')).join('\n')
  const enlaces = [...textos.matchAll(/http:\/\/localhost:5173\/definir-clave\/[^\s"<]+/g)].map(m => m[0])
  expect(enlaces.length, 'no llegó ningún correo con enlace').toBeGreaterThan(0)
  return enlaces[enlaces.length - 1]
}
