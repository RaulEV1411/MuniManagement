import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { login, getResumenLogin } from '@/lib/api'
import axios from 'axios'
import { mensajeDeError } from '@/lib/errores'
import { useAppStore } from '@/store/app'
import LogoInstitucion from '@/components/common/LogoInstitucion'
import { useMarca, useTituloDePagina } from '@/hooks/useMarca'

const schema = z.object({
  email:    z.string().email('Correo inválido'),
  password: z.string().min(1, 'Ingrese su contraseña'),
})
type Form = z.infer<typeof schema>

export default function LoginPage() {
  useTituloDePagina('Iniciar sesión')
  const marca = useMarca()
  const [showPass, setShowPass] = useState(false)
  const navigate = useNavigate()
  const { iniciarSesion, isDark, toggleTheme } = useAppStore()

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: Form) => {
    try {
      iniciarSesion(await login(data.email, data.password))
      // Fire-and-forget: no bloquear navegación si el resumen tarda
      getResumenLogin()
        .then(resumen => {
          const total =
            (resumen?.proyectos_por_vencer?.length ?? 0) +
            (resumen?.tareas_por_vencer?.length ?? 0)
          if (total > 0) {
            toast.warning(
              total === 1 ? 'Tiene 1 pendiente por vencer en los próximos 4 días.' : `Tiene ${total} pendientes por vencer en los próximos 4 días.`,
              { duration: 6000 },
            )
          } else if (resumen?.no_leidas > 0) {
            toast.info(resumen.no_leidas === 1 ? 'Tiene 1 aviso sin leer.' : `Tiene ${resumen.no_leidas} avisos sin leer.`)
          }
        })
        .catch(() => {})
      navigate('/dashboard')
    } catch (err) {
      // 400 = correo o contraseña incorrectos; lo demás (sin conexión, 429, 500) se explica tal cual.
      const credenciales = axios.isAxiosError(err) && err.response?.status === 400
      toast.error(credenciales ? 'Correo o contraseña incorrectos.' : mensajeDeError(err, 'No se pudo iniciar sesión.'))
    }
  }

  return (
    <div className="min-h-screen flex bg-background">

      {/* ── Panel izquierdo — marca ── */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="hidden lg:flex flex-col w-[420px] flex-shrink-0 bg-ocean-700 relative overflow-hidden"
      >
        {/* Fondo decorativo */}
        <div className="absolute inset-0">
          <div className="absolute top-20 -left-20 w-72 h-72 rounded-full bg-white/5" />
          <div className="absolute bottom-10 right-10 w-48 h-48 rounded-full bg-white/5" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-white/3" />
        </div>

        <div className="relative z-10 flex flex-col h-full p-10">
          <div className="flex items-center gap-3">
            <LogoInstitucion tamano={40} claro />
            <div>
              <p className="text-white font-bold text-sm leading-tight">{marca.nombre}</p>
              {marca.ubicacion && <p className="text-white/85 text-xs">{marca.ubicacion}</p>}
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            <h1 className="text-4xl font-bold text-white leading-tight mb-4">
              Sistema de<br />Gestión Municipal
            </h1>
            <p className="text-white/85 text-sm leading-relaxed">
              Proyectos, equipos y presupuestos de la municipalidad en un solo lugar.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {[
              { value: 'Proyectos', label: 'Activos' },
              { value: 'Equipos',   label: 'Colaborando' },
              { value: '100%',      label: 'Digital' },
            ].map(s => (
              <div key={s.label} className="bg-white/10 rounded-xl p-3">
                <p className="text-white font-bold text-sm">{s.value}</p>
                <p className="text-white text-[10px] mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Panel derecho — formulario ── */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 relative">

        {/* Toggle tema */}
        <button
          onClick={toggleTheme}
          aria-label={isDark ? 'Usar el modo claro' : 'Usar el modo oscuro'}
          className="absolute top-6 right-6 p-2 rounded-xl bg-muted hover:bg-accent transition-colors text-muted-foreground"
        >
          {isDark
            ? <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
            : <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
          }
        </button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="w-full max-w-sm"
        >
          {/* Logo móvil */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <LogoInstitucion tamano={32} />
            <span className="font-bold text-ocean-500 dark:text-ocean-200">{marca.nombre}</span>
          </div>

          <h2 className="text-2xl font-bold text-foreground mb-1">Le damos la bienvenida</h2>
          <p className="text-sm text-muted-foreground mb-8">Ingrese su correo y su contraseña para continuar.</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label htmlFor="login-correo-electronico" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                Correo electrónico
              </label>
              <input id="login-correo-electronico"
                {...register('email')}
                type="email"
                autoComplete="email"
                placeholder="usuario@municipalidad.go.cr"
                className="w-full px-3.5 py-2.5 text-sm bg-background border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
              />
              {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label htmlFor="login-contrasena" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                Contraseña
              </label>
              <div className="relative">
                <input id="login-contrasena"
                  {...register('password')}
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 pr-10 text-sm bg-background border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  aria-label={showPass ? 'Ocultar la contraseña' : 'Mostrar la contraseña'}
                  aria-pressed={showPass}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-destructive mt-1">{errors.password.message}</p>}
              <Link to="/olvide-clave" className="inline-block text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline mt-2">
                ¿Olvidó su contraseña?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-ocean-500 hover:bg-ocean-600 disabled:opacity-60 text-white font-semibold text-sm rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-2"
            >
              {isSubmitting && <Loader2 size={15} className="animate-spin" />}
              {isSubmitting ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  )
}
