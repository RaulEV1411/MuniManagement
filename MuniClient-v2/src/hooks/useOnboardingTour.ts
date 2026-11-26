import { useState } from 'react'
import { useAppStore } from '@/store/app'
import { completarOnboarding } from '@/lib/api'

const keyFor = (userId?: string | null) => `muni-onboarding-done:${userId ?? 'anon'}`

export function useOnboardingTour() {
  const { user } = useAppStore()
  const userId = user?.user_ID
  // Lo que el usuario eligió en esta sesión (terminar o volver a ver el tour), por usuario.
  const [eleccion, setEleccion] = useState<{ userId: string; show: boolean } | null>(null)

  const pendiente = !!userId && typeof window !== 'undefined' && !localStorage.getItem(keyFor(userId))
  const show = eleccion && eleccion.userId === userId ? eleccion.show : pendiente

  const finish = () => {
    if (userId) {
      localStorage.setItem(keyFor(userId), '1')
      setEleccion({ userId, show: false })
    }
    completarOnboarding().catch(() => {})
  }

  const restart = () => {
    if (userId) {
      localStorage.removeItem(keyFor(userId))
      setEleccion({ userId, show: true })
    }
  }

  return { show, finish, restart }
}
