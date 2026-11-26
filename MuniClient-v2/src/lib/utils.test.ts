import { describe, expect, it } from 'vitest'
import { formatDate, isOverdue } from './utils'

describe('formatDate', () => {
  it('pasa de AAAA-MM-DD a DD/MM/AAAA y muestra — si no hay fecha', () => {
    expect(formatDate('2026-11-25')).toBe('25/11/2026')
    expect(formatDate(null)).toBe('—')
  })
})

describe('isOverdue', () => {
  it('solo lo abierto con fecha pasada está vencido', () => {
    expect(isOverdue({ fecha_entrega: '2020-01-01', estado_ID: { name: 'En progreso' } })).toBe(true)
    expect(isOverdue({ fecha_entrega: '2020-01-01', estado_ID: { name: 'Completado' } })).toBe(false)
    expect(isOverdue({ fecha_entrega: '2020-01-01', estado_ID: { name: 'Cancelado' } })).toBe(false)
    expect(isOverdue({ fecha_entrega: '2999-01-01', estado_ID: { name: 'Pendiente' } })).toBe(false)
    expect(isOverdue({})).toBe(false)
  })
})
