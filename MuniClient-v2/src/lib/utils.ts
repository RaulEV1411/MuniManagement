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

export function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr + 'T23:59:59').getTime() - Date.now()) / 86400000)
}

export function isOverdue(project: { fecha_entrega?: string; estado_ID?: { name: string } }): boolean {
  if (!project.fecha_entrega) return false
  const status = project.estado_ID?.name
  if (status === 'Completado' || status === 'Cancelado') return false
  return daysUntil(project.fecha_entrega) < 0
}

export function getInitials(firstName: string, lastName: string): string {
  return ((firstName?.[0] ?? '') + (lastName?.[0] ?? '')).toUpperCase() || '?'
}

export function fullName(user: { first_name: string; last_name: string }): string {
  return `${user.first_name} ${user.last_name}`.trim()
}
