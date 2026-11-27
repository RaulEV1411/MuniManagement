import { Link, useLocation } from 'react-router-dom'
import { Inbox, LayoutDashboard, ListChecks, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import NotificationBell from '@/components/notifications/NotificationBell'

const clase = 'flex flex-col items-center justify-center gap-0.5 h-14 w-full text-[11px] font-medium transition-colors'

/** En el celular: lo de todos los días abajo, al alcance del pulgar; el resto del menú, en «Más». */
export default function BarraInferior({ onMas, masAbierto }: { onMas: () => void; masAbierto: boolean }) {
  const { pathname } = useLocation()
  const destinos = [
    { icono: LayoutDashboard, nombre: 'Proyectos', ruta: '/dashboard', activo: pathname === '/dashboard' || pathname.startsWith('/projects') },
    { icono: ListChecks, nombre: 'Mis tareas', ruta: '/mis-tareas', activo: pathname === '/mis-tareas' },
    { icono: Inbox, nombre: 'Solicitudes', ruta: '/solicitudes', activo: pathname === '/solicitudes' },
  ]
  return (
    <nav aria-label="Accesos principales" className="flex-shrink-0 grid grid-cols-5 border-t border-border bg-card pb-[env(safe-area-inset-bottom)]">
      {destinos.map(({ icono: Icono, nombre, ruta, activo }) => (
        <Link key={ruta} to={ruta} aria-current={activo ? 'page' : undefined}
          className={cn(clase, activo ? 'text-ocean-500 dark:text-ocean-200 font-semibold' : 'text-muted-foreground hover:text-foreground')}>
          <Icono size={20} aria-hidden />
          {nombre}
        </Link>
      ))}
      <NotificationBell enBarra />
      <button type="button" onClick={onMas} aria-expanded={masAbierto} aria-haspopup="dialog"
        className={cn(clase, 'text-muted-foreground hover:text-foreground')}>
        <MoreHorizontal size={20} aria-hidden />
        Más
      </button>
    </nav>
  )
}
