import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import GlobalSearch from './GlobalSearch'
import NotificationBell from '@/components/notifications/NotificationBell'
import OnboardingTour from './OnboardingTour'
import { useAppStore } from '@/store/app'

export default function AppShell() {
  const { user, refreshUserFromBackend } = useAppStore()

  useEffect(() => {
    // Si el JWT no traía first_name/last_name/email/role, hidratar desde /me/
    if (!user?.first_name || !user?.email || !user?.role) {
      refreshUserFromBackend().catch(() => {})
    }
  }, [user?.first_name, user?.email, user?.role, refreshUserFromBackend])

  return (
    <div className="flex h-full bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="flex items-center justify-end gap-3 px-6 py-3 border-b border-border bg-card/40 backdrop-blur">
          <NotificationBell />
        </header>
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      <GlobalSearch />
      <OnboardingTour />
    </div>
  )
}
