import type { Estado } from '@/types'

// Pasar a un estado pausado exige un motivo (el servidor también lo exige).
export const pideMotivo = (e: Pick<Estado, 'categoria'> | undefined) => e?.categoria === 'pausado'

// A un estado finalizado (Completado, Cancelado…) se llega solo con «Cerrar proyecto».
export const esFinal = (e: Pick<Estado, 'categoria'> | null | undefined) => e?.categoria === 'finalizado'

export const CATEGORIAS_DE_ESTADO = [
  { codigo: 'activo', nombre: 'Activo' },
  { codigo: 'pausado', nombre: 'Pausado' },
  { codigo: 'finalizado', nombre: 'Finalizado' },
]

export const PESTANAS_DE_PROYECTOS = [
  { clave: 'activo', nombre: 'Activos' },
  { clave: 'pausado', nombre: 'Pausados' },
  { clave: 'finalizado', nombre: 'Finalizados' },
  { clave: 'archivados', nombre: 'Archivados' },
] as const
export type PestanaProyectos = typeof PESTANAS_DE_PROYECTOS[number]['clave']
