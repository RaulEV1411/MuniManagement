import { describe, expect, it } from 'vitest'
import { contraste, contrasteConBlanco, formatearMonto, paleta, principalParaOscuro, simboloDe } from './marca'

describe('paleta', () => {
  it('el tono 500 es el color elegido y los extremos van hacia blanco y negro', () => {
    const p = paleta('#0C3857')
    expect(p[500]).toBe('12 56 87')
    expect(p[50].split(' ').map(Number).every(c => c > 230)).toBe(true)
    expect(p[900].split(' ').map(Number).every(c => c < 45)).toBe(true)
  })
})

describe('contraste', () => {
  it('coincide con la validación del servidor (4,5:1 con texto blanco)', () => {
    expect(contrasteConBlanco('#0C3857')).toBeGreaterThan(4.5)
    expect(contrasteConBlanco('#f5d90a')).toBeLessThan(4.5)
    expect(contrasteConBlanco('#ffffff')).toBeCloseTo(1)
    expect(contrasteConBlanco('#000000')).toBeCloseTo(21)
  })

  it('el principal de modo oscuro se lee con texto oscuro, aun con colores difíciles', () => {
    for (const color of ['#0C3857', '#0000ff', '#000000', '#1f6f43', '#7a1f1f']) {
      const claro = principalParaOscuro(color)
      expect(claro).toMatch(/^#[0-9a-f]{6}$/)
      expect(contraste(claro, '#121820')).toBeGreaterThanOrEqual(4.5)
    }
  })
})

describe('montos', () => {
  it('usa la moneda de la instalación', () => {
    expect(formatearMonto(1_500_000, 'CRC')).toMatch(/^₡\s?1\s500\s000$/)
    expect(formatearMonto(1500, 'USD')).toMatch(/^\$\s?1\s500$/)
    expect(simboloDe('CRC')).toBe('₡')
  })

  it('con un código que no existe muestra el código y no se rompe', () => {
    expect(formatearMonto(10, 'XX')).toBe('XX 10')
    expect(simboloDe('XX')).toBe('XX')
  })
})
