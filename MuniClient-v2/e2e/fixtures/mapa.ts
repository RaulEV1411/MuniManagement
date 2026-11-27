// El mapa y la búsqueda de direcciones de las e2e apuntan a hosts falsos (playwright.config.ts): acá se
// responden, así ninguna prueba sale a internet ni depende de OpenFreeMap o de Nominatim.
import type { Page } from '@playwright/test'

// Un estilo mínimo: solo el fondo, sin teselas ni tipografías.
export const ESTILO = { version: 8, name: 'e2e', sources: {}, layers: [{ id: 'fondo', type: 'background', paint: { 'background-color': '#dde7ee' } }] }

export const DIRECCION_DE_PRUEBA = { display_name: 'Parque Central, Carmen', lat: '9.933300', lon: '-84.080000' }

export async function servirMapa(page: Page) {
  await page.route('https://mapa.e2e.test/**', route => route.fulfill({ json: ESTILO }))
  await page.route('https://direcciones.e2e.test/**', route => route.fulfill({ json: [DIRECCION_DE_PRUEBA] }))
}

/** Para probar cómo se degrada el portal cuando el servicio del mapa no responde. */
export async function mapaCaido(page: Page) {
  await page.route('https://mapa.e2e.test/**', route => route.abort('connectionrefused'))
}
