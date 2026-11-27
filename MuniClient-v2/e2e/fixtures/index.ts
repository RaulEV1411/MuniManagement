// Fixtures y ayudantes de las e2e (estándar en planning/munimanagement-estandar-pruebas.md).
//
// Datos:
// - La semilla (`manage.py datos_e2e`) deja personas y catálogos que NADIE cambia: Ana, Beto, Fabi, Jorge,
//   el proyecto «Acera central» y los demás. Se usan solo para leer.
// - Lo que una prueba cambia lo crea ella misma con la fixture `escenario` (un proyecto con sus tareas)
//   o `escenarioConPersona` (además, una persona propia para cambiarle la clave o cerrarle sesiones).
//
// Etiquetas: @critico (flujo vital), @lectura (no escribe), @muta (escribe sobre datos propios),
// @global (cambia algo compartido: corre al final, de a una), @a11y (axe).
import { test as base, expect, type APIRequestContext, type Page, type Response } from '@playwright/test'
import { readdirSync, readFileSync } from 'fs'
import path from 'path'

import { servirMapa } from './mapa'

export { expect }
export { DIRECCION_DE_PRUEBA, mapaCaido } from './mapa'

export const CLAVE = 'Clave-E2E-2026'
export const ANA = 'ana@muni.test'      // Administrador
export const BETO = 'beto@muni.test'    // Funcionario
export const FABI = 'fabi@muni.test'    // Funcionaria (sin permiso de crear proyectos por defecto)
export const JORGE = 'jorge@muni.test'  // Jefe del departamento de Obras (aprueba solicitudes)

const API = `http://localhost:${process.env.E2E_PUERTO_API ?? '8000'}/api/v1`

// Si el access vence en medio de una acción (con E2E_ACCESS_SEGUNDOS corto, o en una prueba que borra su
// cookie), la primera respuesta es un 401 y la app renueva y reintenta. Por eso las esperas saltean los 401.
export function esperarRespuesta(page: Page, url: string | RegExp, metodo?: string): Promise<Response> {
  return page.waitForResponse(r => r.status() !== 401
    && (typeof url === 'string' ? r.url().includes(url) : url.test(r.url()))
    && (!metodo || r.request().method() === metodo))
}

export async function entrar(page: Page, email = ANA, clave = CLAVE, { aceptarAviso = true } = {}) {
  await page.goto('/login')
  await page.fill('input[type=email]', email)
  await page.fill('input[type=password]', clave)
  const login = page.waitForResponse(r => r.url().includes('/users/login/'))
  await page.click('button[type=submit]')
  const datos = await (await login).json()
  await page.waitForURL('**/dashboard')
  // Si una prueba @global publicó una versión nueva del aviso de privacidad, se acepta para seguir.
  if (datos.privacidad_pendiente && aceptarAviso) {
    await page.getByRole('dialog', { name: 'Aviso de privacidad' }).getByRole('button', { name: 'Leí el aviso y acepto' }).click()
    await expect(page.getByRole('dialog', { name: 'Aviso de privacidad' })).toHaveCount(0)
  }
}

/** El último enlace para definir la contraseña que mandó Django a ese correo (backend de correo en archivos). */
export function ultimoEnlaceDeAcceso(para?: string): string {
  const dir = process.env.E2E_CORREOS!
  const archivos = readdirSync(dir).map(f => path.join(dir, f)).sort()
  const textos = archivos.map(f => readFileSync(f, 'utf8')).filter(t => !para || t.includes(para)).join('\n')
  const web = process.env.E2E_PUERTO_WEB ?? '5173'
  const enlaces = [...textos.matchAll(new RegExp(`http://localhost:${web}/definir-clave/[^\\s"<]+`, 'g'))].map(m => m[0])
  expect(enlaces.length, 'no llegó ningún correo con enlace').toBeGreaterThan(0)
  return enlaces[enlaces.length - 1]
}

export interface Escenario {
  run: string
  proyecto: { id: string; nombre: string }
  // Demarcar, Excavar, Revisar planos, Comprar cemento y Esperar permiso, asignadas a Fabi.
  tareas: Record<string, string>
  persona: { id: string; email: string; nombre: string } | null
}

async function crearEscenario(request: APIRequestContext, run: string, persona: boolean): Promise<Escenario> {
  const r = await request.post(`${API}/e2e/escenario/`, { data: { run, persona } })
  expect(r.status(), 'no se pudo crear el escenario de la prueba').toBe(201)
  return r.json()
}

const idDeCorrida = (info: { workerIndex: number; retry: number; repeatEachIndex: number }) =>
  `e2e-${info.workerIndex}${info.retry}${info.repeatEachIndex}-${Date.now().toString(36)}`

// El segundo parámetro de una fixture es el `use` de Playwright; se llama `entregar` para que el lint
// de React no lo tome por un hook.
export const test = base.extend<{ escenario: Escenario; escenarioConPersona: Escenario }>({
  page: async ({ page }, entregar) => {
    await servirMapa(page)
    await entregar(page)
  },
  escenario: async ({ request }, entregar, info) => {
    await entregar(await crearEscenario(request, idDeCorrida(info), false))
  },
  escenarioConPersona: async ({ request }, entregar, info) => {
    await entregar(await crearEscenario(request, idDeCorrida(info), true))
  },
})
