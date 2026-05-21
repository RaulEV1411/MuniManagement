import { useEffect, useState } from 'react'
import { useAppStore } from '@/store/app'
import { completarOnboarding } from '@/lib/api'

const keyFor = (userId?: string | null) => `muni-onboarding-done:${userId ?? 'anon'}`

export function useOnboardingTour() {
  const { user } = useAppStore()
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !user?.user_ID) {
      setShow(false)
      return
    }
    const done = localStorage.getItem(keyFor(user.user_ID))
    setShow(!done)
  }, [user?.user_ID])

  const finish = () => {
    if (user?.user_ID) localStorage.setItem(keyFor(user.user_ID), '1')
    setShow(false)
    completarOnboarding().catch(() => {})
  }

  const restart = () => {
    if (user?.user_ID) localStorage.removeItem(keyFor(user.user_ID))
    setShow(true)
  }

  return { show, finish, restart }
}
