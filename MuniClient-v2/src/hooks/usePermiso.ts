import { useAppStore } from '@/store/app'

/** ¿El rol de la persona tiene este permiso con algún alcance? (el servidor decide el alcance exacto). */
export function tienePermiso(user: { role?: string; permisos?: Record<string, string> } | null | undefined, codigo: string): boolean {
  if (!user) return false
  if (user.role === 'Administrador') return true
  return !!user.permisos?.[codigo]
}

export function usePermiso(codigo: string): boolean {
  const user = useAppStore(s => s.user)
  return tienePermiso(user, codigo)
}

/** El alcance con que la persona tiene el permiso: propio, departamento, direccion o todos. */
export function useAlcance(codigo: string): string | undefined {
  const user = useAppStore(s => s.user)
  if (user?.role === 'Administrador') return 'todos'
  return user?.permisos?.[codigo]
}
