import type { Solicitud } from '@/types'
import { formatDate } from './utils'

/** Qué pide, en una línea: «25/01/2027 → 10/02/2027 (+16 días)», «+₡500 000», «Jorge como Observador». */
export function resumenDeSolicitud(s: Solicitud, formatear: (n: number) => string): string {
  switch (s.efecto) {
    case 'plazo': return `${formatDate(s.fecha_actual)} → ${formatDate(s.nueva_fecha)} (+${s.impacto} días)`
    case 'aumento': return `+${formatear(s.monto ?? 0)}`
    case 'rebajo': return `−${formatear(s.monto ?? 0)}`
    case 'personal': return `${s.persona_nombre} como ${s.rol_proyecto_nombre}`
    case 'responsable': return `Pasa a ${s.persona_nombre}`
    default: return ''
  }
}

export const CLASE_ESTADO_SOLICITUD: Record<Solicitud['estado'], string> = {
  enviada: 'bg-sky-50 text-sky-800 dark:bg-sky-500/10 dark:text-sky-200',
  en_revision: 'bg-indigo-50 text-indigo-800 dark:bg-indigo-500/10 dark:text-indigo-200',
  aprobada: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200',
  rechazada: 'bg-red-50 text-red-800 dark:bg-red-500/10 dark:text-red-200',
  retirada: 'bg-muted text-muted-foreground',
}
