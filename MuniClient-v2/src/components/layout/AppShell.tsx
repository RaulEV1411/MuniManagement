import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Menu } from 'lucide-react'
import Sidebar from './Sidebar'
import GlobalSearch from './GlobalSearch'
import NotificationBell from '@/components/notifications/NotificationBell'
import OnboardingTour from './OnboardingTour'
import Dialogo from '@/components/common/Dialogo'
import LogoInstitucion from '@/components/common/LogoInstitucion'
import { useMarca } from '@/hooks/useMarca'

export default function AppShell() {
  const marca = useMarca()
  const { pathname } = useLocation()
  // El cajón queda abierto solo en la página donde se abrió: al navegar se cierra solo.
  const [menuEn, setMenuEn] = useState<string | null>(null)
  const menu = menuEn === pathname

  return (
    <div className="flex h-full bg-background">
      {/* WCAG 2.4.1: con el teclado se salta el menú y se va directo al contenido. */}
      <a
        href="#contenido"
        onClick={e => { e.preventDefault(); document.getElementById('contenido')?.focus() }}
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[300] focus:px-4 focus:py-2 focus:rounded-xl focus:bg-card focus:text-foreground focus:text-sm focus:font-semibold focus:shadow-lg focus:ring-2 focus:ring-ring"
      >
        Saltar al contenido
      </a>
      {/* Desde 1024 px el menú queda fijo a la izquierda; más angosto, se abre como cajón. */}
      <div className="hidden lg:flex h-full">
        <Sidebar />
      </div>
      {menu && (
        <Dialogo titulo="Menú" onCerrar={() => setMenuEn(null)} className="items-stretch justify-start p-0" centrado={false} cerrarAlTocarFondo>
          <Sidebar enCajon />
        </Dialogo>
      )}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="flex items-center justify-between lg:justify-end gap-3 px-4 sm:px-6 py-3 border-b border-border bg-card/40 backdrop-blur">
          <div className="flex items-center gap-3 min-w-0 lg:hidden">
            <button
              type="button"
              onClick={() => setMenuEn(pathname)}
              aria-label="Abrir el menú"
              aria-expanded={menu}
              className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl border border-border bg-card hover:bg-accent transition"
            >
              <Menu className="h-5 w-5 text-foreground" aria-hidden="true" />
            </button>
            <LogoInstitucion tamano={28} />
            <span className="text-sm font-bold text-ocean-500 dark:text-ocean-200 truncate">{marca.nombre}</span>
          </div>
          <NotificationBell />
        </header>
        <main id="contenido" tabIndex={-1} className="flex-1 overflow-y-auto focus:outline-none">
          <Outlet />
        </main>
      </div>
      <GlobalSearch />
      <OnboardingTour />
    </div>
  )
}
