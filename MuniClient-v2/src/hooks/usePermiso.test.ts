import { describe, expect, it } from 'vitest'
import { tienePermiso } from './usePermiso'

describe('permisos en el front', () => {
  it('el Administrador tiene todo, aunque no le lleguen los permisos', () => {
    expect(tienePermiso({ role: 'Administrador' }, 'roles.gestionar')).toBe(true)
  })

  it('el resto, solo lo que trae su rol (con cualquier alcance)', () => {
    const funcionario = { role: 'Funcionario', permisos: { 'proyectos.ver': 'propio' } }
    expect(tienePermiso(funcionario, 'proyectos.ver')).toBe(true)
    expect(tienePermiso(funcionario, 'proyectos.crear')).toBe(false)
  })

  it('sin sesión, nada', () => {
    expect(tienePermiso(null, 'proyectos.ver')).toBe(false)
  })
})
