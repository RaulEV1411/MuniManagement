import type { CSSProperties } from 'react'

// Los colores de estados y prioridades vienen de la base (Configuración), no del código.
// La etiqueta usa el color con fondo suave y texto oscurecido para que se lea bien.
export const COLOR_VENCIDO = '#dc2626'
const COLOR_NEUTRO = '#64748b'

export const claseEtiqueta =
  '[background-color:color-mix(in_srgb,var(--c)_14%,transparent)] [color:color-mix(in_srgb,var(--c)_55%,black)] dark:[color:color-mix(in_srgb,var(--c)_65%,white)]'

export const claseRelleno = '[background-color:var(--c)]'

export function conColor(color?: string | null): CSSProperties {
  return { '--c': color || COLOR_NEUTRO } as CSSProperties
}

/** Color del estado de un proyecto, o rojo si está vencido. */
export function colorDeEstado(vencido: boolean, estado?: { color?: string } | null): string | undefined {
  return vencido ? COLOR_VENCIDO : estado?.color
}

function luminancia(hex: string): number {
  const n = parseInt(hex.slice(1, 7), 16)
  const canales = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(c => c / 255)
  const [r, g, b] = canales.map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

const OSCURO = '#0f172a'

/** Texto para escribir sobre un fondo de ese color: blanco o casi negro, el de mayor contraste. */
export function textoSobre(fondo?: string | null): string {
  if (!fondo || !/^#[0-9a-fA-F]{6}$/.test(fondo)) return '#ffffff'
  const l = luminancia(fondo)
  return 1.05 / (l + 0.05) >= (l + 0.05) / (luminancia(OSCURO) + 0.05) ? '#ffffff' : OSCURO
}
