// Tipos de identificación (Costa Rica) y cómo se muestran; el servidor valida y guarda el número sin guiones.
export const TIPOS_IDENTIFICACION = [
  { codigo: 'fisica', nombre: 'Cédula física', ejemplo: '1-1234-5678' },
  { codigo: 'dimex', nombre: 'DIMEX', ejemplo: '155812345678' },
  { codigo: 'nite', nombre: 'NITE', ejemplo: '1234567890' },
  { codigo: 'pasaporte', nombre: 'Pasaporte', ejemplo: 'AB1234567' },
] as const

export function formatearIdentificacion(tipo: string | undefined, numero: string | number | null | undefined): string {
  const n = String(numero ?? '')
  if (!n) return '—'
  const nombre = TIPOS_IDENTIFICACION.find(t => t.codigo === tipo)?.nombre ?? 'Identificación'
  const legible = (tipo ?? 'fisica') === 'fisica' && /^\d{9}$/.test(n) ? `${n[0]}-${n.slice(1, 5)}-${n.slice(5)}` : n
  return `${legible} (${nombre})`
}
