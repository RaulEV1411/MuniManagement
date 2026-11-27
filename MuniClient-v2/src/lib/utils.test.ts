import { afterEach, describe, expect, it, vi } from 'vitest'
import { formatDate, formatearDuracion, formatearFechaLarga, hoyLocal, isOverdue } from './utils'

describe('hoyLocal', () => {
  afterEach(() => vi.useRealTimers())
  it('da la fecha local aunque en UTC ya sea el día siguiente', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 10, 26, 23, 30))
    expect(hoyLocal()).toBe('2026-11-26')
  })
})

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

describe('fecha larga', () => {
  it('se lee completa y no se corre de día por la zona horaria', () => {
    expect(formatearFechaLarga('2026-11-15')).toBe('15 de noviembre de 2026')
    expect(formatearFechaLarga('2027-01-01')).toBe('1 de enero de 2027')
    expect(formatearFechaLarga(null)).toBe('—')
  })
})

describe('formatearDuracion', () => {
  it('muestra horas y minutos, sin ceros de más', () => {
    expect(formatearDuracion(30)).toBe('menos de 1 min')
    expect(formatearDuracion(300)).toBe('5 min')
    expect(formatearDuracion(7200)).toBe('2 h')
    expect(formatearDuracion(8100)).toBe('2 h 15 min')
  })
})
