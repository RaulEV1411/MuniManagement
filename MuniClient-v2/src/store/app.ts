import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { jwtDecode } from 'jwt-decode'
import { getCookie, deleteCookie } from '@/lib/utils'
import { getMe } from '@/lib/api'

interface RoleFlags {
  puede_delegar: boolean
  puede_recibir_delegacion: boolean
  puede_ver_todo: boolean
}

interface DecodedToken {
  user_ID: string
  first_name: string
  last_name: string
  email: string
  role: string
  user_photo: string | null
  role_flags?: RoleFlags
}

interface AppState {
  isDark: boolean
  user: DecodedToken | null
  toggleTheme: () => void
  initTheme: () => void
  loadUserFromToken: () => void
  refreshUserFromBackend: () => Promise<void>
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
          // Hidrata datos faltantes desde el backend si el token es viejo
          get().refreshUserFromBackend().catch(() => {})
        } catch {
          set({ user: null })
        }
      },

      refreshUserFromBackend: async () => {
        try {
          const me = await getMe()
          set(state => ({
            user: state.user
              ? { ...state.user, ...me }
              : me as DecodedToken,
          }))
        } catch { /* ignorar */ }
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

export function initApp() {
  const isDark = useAppStore.getState().isDark
  document.documentElement.classList.toggle('dark', isDark)
}
