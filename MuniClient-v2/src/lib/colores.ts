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
