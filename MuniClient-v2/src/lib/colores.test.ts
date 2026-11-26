import { describe, expect, it } from 'vitest'
import { COLOR_VENCIDO, colorDeEstado, conColor, textoSobre } from './colores'

describe('colores de la base', () => {
  it('lo vencido siempre es rojo, aunque su estado tenga otro color', () => {
    expect(colorDeEstado(true, { color: '#16a34a' })).toBe(COLOR_VENCIDO)
  })

  it('si no está vencido usa el color del estado', () => {
    expect(colorDeEstado(false, { color: '#a855f7' })).toBe('#a855f7')
    expect(colorDeEstado(false, null)).toBeUndefined()
  })

  it('sin color cae en un gris neutro', () => {
    expect(conColor(undefined)).toEqual({ '--c': '#64748b' })
    expect(conColor('#dc2626')).toEqual({ '--c': '#dc2626' })
  })
})

describe('texto sobre un color sólido', () => {
  it('elige blanco o casi negro, el que se lea mejor', () => {
    expect(textoSobre('#0C3857')).toBe('#ffffff')
    expect(textoSobre('#f59e0b')).toBe('#0f172a')
    expect(textoSobre('#16a34a')).toBe('#0f172a')
    expect(textoSobre('#94a3b8')).toBe('#0f172a')
    expect(textoSobre('#7e22ce')).toBe('#ffffff')
  })

  it('sin color válido usa blanco', () => {
    expect(textoSobre(null)).toBe('#ffffff')
    expect(textoSobre('rojo')).toBe('#ffffff')
  })
})
