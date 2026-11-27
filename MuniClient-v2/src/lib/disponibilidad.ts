import type { TipoAusencia, User } from '@/types'
import { formatDate } from '@/lib/utils'

export const NOMBRE_DE_AUSENCIA: Record<TipoAusencia, string> = { vacaciones: 'Vacaciones', incapacidad: 'Incapacidad', permiso: 'Permiso' }

/** «Vacaciones hasta el 12/12/2026» (o «Ausente hasta…» si quien mira no puede ver el tipo); null si está disponible. */
export function textoDeDisponibilidad(u: Pick<User, 'disponibilidad'>) {
  const d = u.disponibilidad
  if (!d || d.estado !== 'ausente') return null
  return `${d.tipo ? NOMBRE_DE_AUSENCIA[d.tipo] : 'Ausente'} hasta el ${formatDate(d.hasta)}`
}

/** La opción de una persona al asignar una tarea: si está ausente, su carga y sus especialidades. */
export function etiquetaParaAsignar(u: Pick<User, 'first_name' | 'last_name' | 'disponibilidad' | 'carga' | 'especialidades'>) {
  const partes = [`${u.first_name} ${u.last_name}`]
  const ausente = textoDeDisponibilidad(u)
  if (ausente) partes.push(ausente)
  if (u.carga) partes.push(`${u.carga.tareas_abiertas} ${u.carga.tareas_abiertas === 1 ? 'tarea abierta' : 'tareas abiertas'}`)
  if (u.especialidades?.length) partes.push(u.especialidades.map(e => e.name).join(', '))
  return partes.join(' · ')
}
