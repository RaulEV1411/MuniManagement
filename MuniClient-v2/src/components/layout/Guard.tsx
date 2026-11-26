import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAppStore } from '@/store/app'

// Las cookies de sesión son HttpOnly: para saber si hay sesión se le pregunta al servidor.
export default function Guard() {
  const user = useAppStore(s => s.user)
  const [sinSesion, setSinSesion] = useState(false)

  useEffect(() => {
    if (user) return
    let vigente = true
    useAppStore.getState().cargarSesion().then(ok => { if (vigente && !ok) setSinSesion(true) })
    return () => { vigente = false }
  }, [user])

  if (user) return <Outlet />
  if (sinSesion) return <Navigate to="/login" replace />
  return (
    <div className="h-full flex items-center justify-center text-muted-foreground" role="status">
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
      <span className="sr-only">Cargando sesión…</span>
    </div>
  )
}
