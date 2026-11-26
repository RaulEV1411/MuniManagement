import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getMe, logout as apiLogout, setCsrfToken } from '@/lib/api'

interface RoleFlags {
  puede_delegar: boolean
  puede_recibir_delegacion: boolean
  puede_ver_todo: boolean
}

export interface SessionUser {
  user_ID: string
  first_name: string
  last_name: string
  email: string
  role: string
  user_photo: string | null
  role_flags?: RoleFlags
  departamento_ID?: string
  onboarding_completado?: boolean
}

type DatosDeSesion = SessionUser & { csrf_token?: string }

interface AppState {
  isDark: boolean
  user: SessionUser | null
  toggleTheme: () => void
  initTheme: () => void
  iniciarSesion: (datos: DatosDeSesion) => void
  cargarSesion: () => Promise<boolean>
  logout: () => Promise<void>
}

const sinCsrf = ({ csrf_token, ...user }: DatosDeSesion): SessionUser => {
  setCsrfToken(csrf_token ?? null)
  return user
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

      // Con la respuesta del login: datos de la persona y token CSRF.
      iniciarSesion: datos => set({ user: sinCsrf(datos) }),

      // Al recargar la página: si las cookies de sesión siguen vigentes, /me/ responde.
      cargarSesion: async () => {
        try {
          set({ user: sinCsrf(await getMe()) })
          return true
        } catch {
          set({ user: null })
          return false
        }
      },

      logout: async () => {
        try { await apiLogout() } catch { /* las cookies se borran igual al vencer */ }
        setCsrfToken(null)
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
