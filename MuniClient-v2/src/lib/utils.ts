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
