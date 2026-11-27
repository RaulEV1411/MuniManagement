import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

/** «26/11/2026, 14:05» en la hora local, para fechas con hora (auditoría, sesiones). */
export function formatearFechaHora(iso: string | null | undefined): string {
  if (!iso) return '—'
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return iso
  return new Intl.DateTimeFormat('es-CR', { dateStyle: 'short', timeStyle: 'short' }).format(fecha)
}

/** «2 h 15 min», «5 min» o «menos de 1 min». */
export function formatearDuracion(segundos: number): string {
  const minutos = Math.floor(segundos / 60)
  if (minutos < 1) return 'menos de 1 min'
  const horas = Math.floor(minutos / 60)
  const resto = minutos % 60
  if (!horas) return `${minutos} min`
  return resto ? `${horas} h ${resto} min` : `${horas} h`
}

/** «15 de noviembre de 2026»: para el portal, que lee la ciudadanía. */
export function formatearFechaLarga(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  const [y, m, d] = dateStr.split('-').map(Number)
  if (!y || !m || !d) return dateStr
  return new Intl.DateTimeFormat('es-CR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(y, m - 1, d))
}

/** Hoy (AAAA-MM-DD) en la hora local. toISOString da la fecha de UTC, que en Costa Rica cambia a las 18:00. */
export function hoyLocal(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Días de calendario de hoy (local) a la fecha: 0 hoy, 1 mañana, -1 ayer. Antes redondeaba hacia arriba hasta
 * el fin del día y sumaba uno: «Vence hoy» no salía y lo de ayer todavía no contaba como vencido. */
export function daysUntil(dateStr: string): number {
  const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number)
  const hoy = new Date()
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())) / 86400000)
}

export function isOverdue(project: { fecha_entrega?: string; estado_ID?: { name: string; categoria?: string } }): boolean {
  if (!project.fecha_entrega) return false
  // Lo cerrado (estado finalizado) no vence. Las tareas usan los mismos estados.
  const status = project.estado_ID?.name
  if (project.estado_ID?.categoria === 'finalizado' || status === 'Completado' || status === 'Cancelado') return false
  return daysUntil(project.fecha_entrega) < 0
}

export function getInitials(firstName: string, lastName: string): string {
  return ((firstName?.[0] ?? '') + (lastName?.[0] ?? '')).toUpperCase() || '?'
}

export function fullName(user: { first_name: string; last_name: string }): string {
  return `${user.first_name} ${user.last_name}`.trim()
}
