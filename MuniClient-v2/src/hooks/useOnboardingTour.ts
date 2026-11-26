import { useState } from 'react'
import { useAppStore } from '@/store/app'
import { completarOnboarding } from '@/lib/api'

const keyFor = (userId?: string | null) => `muni-onboarding-done:${userId ?? 'anon'}`

// El tour aparece en el primer ingreso (si el servidor no lo marca como visto) o cuando se
// pide desde Ayuda. Cerrarlo lo marca en el servidor, así no vuelve a salir en otro equipo.
export function useOnboardingTour() {
  const user = useAppStore(s => s.user)
  const forzado = useAppStore(s => s.tourForzado)
  const setTourForzado = useAppStore(s => s.setTourForzado)
  const [cerradoPara, setCerradoPara] = useState<string | null>(null)
  const userId = user?.user_ID

  const pendiente = !!userId && !user?.onboarding_completado && cerradoPara !== userId
    && typeof window !== 'undefined' && !localStorage.getItem(keyFor(userId))
  const show = forzado || pendiente

  const finish = () => {
    if (userId) {
      localStorage.setItem(keyFor(userId), '1')
      setCerradoPara(userId)
    }
    setTourForzado(false)
    completarOnboarding().catch(() => {})
  }

  const restart = () => setTourForzado(true)

  return { show, finish, restart }
}
