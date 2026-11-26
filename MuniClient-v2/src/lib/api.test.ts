import { describe, expect, it } from 'vitest'
import { seg } from './api'

describe('seg', () => {
  it('acepta un UUID y lo deja igual', () => {
    const id = '7393b9bb-db27-42a3-b825-9ea2df84e503'
    expect(seg(id)).toBe(id)
  })

  it('rechaza lo que no es un UUID, para que no se pueda llamar a otro endpoint', () => {
    for (const malo of ['../users/me', '7393b9bb-db27-42a3-b825-9ea2df84e503/../../x', '1', '', 'a b']) {
      expect(() => seg(malo)).toThrow(/Identificador inválido/)
    }
  })
})
