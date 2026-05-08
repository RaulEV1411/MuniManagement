import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { jwtDecode } from 'jwt-decode'
import { getCookie, deleteCookie } from '@/lib/utils'

interface DecodedToken {
  user_ID: string
  first_name: string
  last_name: string
  email: string
  role: string
  user_photo: string | null
}

interface AppState {
  isDark: boolean
  user: DecodedToken | null
  toggleTheme: () => void
  initTheme: () => void
  loadUserFromToken: () => void
  logout: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      isDark: false,
      user: null,

      toggleTheme: () => {
        const next = !get().isDark
        document.documentElement.classList.toggle('dark', next)
        set({ isDark: next })
      },

      initTheme: () => {
        const { isDark } = get()
        document.documentElement.classList.toggle('dark', isDark)
      },

      loadUserFromToken: () => {
        const token = getCookie('accessToken')
        if (!token) { set({ user: null }); return }
        try {
          const decoded = jwtDecode<DecodedToken>(token)
          set({ user: decoded })
        } catch {
          set({ user: null })
        }
      },

      logout: () => {
        deleteCookie('accessToken')
        deleteCookie('refreshToken')
        set({ user: null })
        window.location.href = '/login'
      },
    }),
    {
      name: 'muni-app',
      partialize: state => ({ isDark: state.isDark }),
    },
  ),
)

// Inicializar tema al cargar la app
export function initApp() {
  const isDark = useAppStore.getState().isDark
  document.documentElement.classList.toggle('dark', isDark)
}
