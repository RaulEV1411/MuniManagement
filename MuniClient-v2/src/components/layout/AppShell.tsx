import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import GlobalSearch from './GlobalSearch'
import NotificationBell from '@/components/notifications/NotificationBell'
import OnboardingTour from './OnboardingTour'

export default function AppShell() {
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
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="flex items-center justify-end gap-3 px-6 py-3 border-b border-border bg-card/40 backdrop-blur">
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
