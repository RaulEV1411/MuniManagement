import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Users, Building2, GitBranch,
  LogOut, Moon, Sun, ChevronLeft, ChevronRight,
  Sliders, GanttChartSquare, FileDown, HelpCircle, ShieldCheck, Inbox,
  type LucideIcon,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { getConteoSolicitudes, getResumenProyectos } from '@/lib/api'
import { cn, getInitials } from '@/lib/utils'
import { useAppStore } from '@/store/app'
import LogoInstitucion from '@/components/common/LogoInstitucion'
import { useMarca } from '@/hooks/useMarca'
import { tienePermiso } from '@/hooks/usePermiso'

interface NavItem {
  icon: LucideIcon
  label: string
  path: string
  match: (p: string) => boolean
  showOverdue?: boolean
  // Muestra cuántas solicitudes esperan una decisión de la persona.
  showPorAprobar?: boolean
  // Solo se muestra a quien tiene este permiso.
  permiso?: string
}

const NAV: { label: string; items: NavItem[] }[] = [
  {
    label: 'Principal',
    items: [
      { icon: LayoutDashboard, label: 'Proyectos',     path: '/dashboard',   match: (p: string) => p === '/dashboard' || p.startsWith('/projects'), showOverdue: true },
      { icon: Inbox,           label: 'Solicitudes',   path: '/solicitudes', match: (p: string) => p === '/solicitudes', showPorAprobar: true },
    ],
  },
  {
    label: 'Gestión',
    items: [
      { icon: Users,      label: 'Usuarios',      path: '/users',       match: (p: string) => p.startsWith('/users') },
      { icon: GitBranch,  label: 'Direcciones',   path: '/directions',  match: (p: string) => p === '/directions' },
      { icon: Building2,  label: 'Departamentos', path: '/departments', match: (p: string) => p === '/departments' },
    ],
  },
  {
    label: 'Herramientas',
    items: [
      { icon: GanttChartSquare, label: 'Cronograma', path: '/timeline', match: (p: string) => p === '/timeline' },
      { icon: FileDown,         label: 'Reportes', path: '/reports',  match: (p: string) => p === '/reports' },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { icon: Sliders,     label: 'Configuración', path: '/config', match: (p: string) => p === '/config' },
      { icon: ShieldCheck, label: 'Auditoría',     path: '/auditoria', match: (p: string) => p === '/auditoria', permiso: 'auditoria.ver' },
      { icon: HelpCircle,  label: 'Ayuda',         path: '/ayuda',  match: (p: string) => p === '/ayuda' },
    ],
  },
]

// En pantallas chicas el menú vive en un cajón (AppShell): ahí va siempre expandido y sin el botón de colapsar.
export default function Sidebar({ enCajon = false }: { enCajon?: boolean }) {
  const marca = useMarca()
  const [expandidoElegido, setExpanded] = useState(true)
  const expanded = enCajon || expandidoElegido
  const { isDark, toggleTheme, user, logout } = useAppStore()
  const navigate = useNavigate()
  const location = useLocation()

  // El contador sale del resumen del servidor: con más de una página de proyectos, contar en el
  // navegador daba un número incompleto.
  const { data: resumen } = useQuery({
    queryKey: ['projects', 'resumen'],
    queryFn: () => getResumenProyectos(),
    staleTime: 60_000,
  })
  const overdueCount = resumen?.vencidos ?? 0
  const { data: conteoSolicitudes } = useQuery({ queryKey: ['solicitudes', 'conteo'], queryFn: getConteoSolicitudes, refetchInterval: 120_000 })
  const porAprobar = conteoSolicitudes?.por_aprobar ?? 0

  const W = enCajon ? 280 : expanded ? 240 : 64

  return (
    <motion.aside
      animate={{ width: W }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className="relative flex flex-col h-full max-w-[85vw] bg-card border-r border-border flex-shrink-0 overflow-hidden"
    >
      {/* ── Logo ── */}
      <div className="flex items-center gap-3 px-4 h-14 border-b border-border flex-shrink-0">
        <LogoInstitucion tamano={32} />
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              className="min-w-0"
            >
              <p className="text-[13px] font-bold text-ocean-500 dark:text-ocean-200 leading-tight line-clamp-2 w-[164px]" title={marca.nombre}>{marca.nombre}</p>
              {marca.ubicacion && <p className="text-xs text-muted-foreground truncate w-[164px]">{marca.ubicacion}</p>}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Atajo Cmd+K ── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-3 pt-2 pb-0"
          >
            <button
              onClick={() => {
                window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))
              }}
              className="flex items-center gap-2 w-full px-2.5 py-1.5 text-xs text-muted-foreground bg-muted/50 hover:bg-accent rounded-xl transition-colors border border-border/50"
            >
              <span className="flex-1 text-left">Buscar...</span>
              <kbd className="text-xs bg-background border border-border rounded px-1 py-0.5">⌘K</kbd>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Navegación ── */}
      <nav className="flex-1 overflow-y-auto py-2 px-3 space-y-0.5">
        {NAV.map(({ label, items }) => (
          <div key={label}>
            <AnimatePresence>
              {expanded && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-2 pt-3 pb-1.5 whitespace-nowrap"
                >
                  {label}
                </motion.p>
              )}
            </AnimatePresence>
            {!expanded && <div className="h-2" />}
            {items.filter(i => !i.permiso || tienePermiso(user, i.permiso)).map(({ icon: Icon, label: itemLabel, path, match, showOverdue, showPorAprobar }) => {
              const active = match(location.pathname)
              const badge = showOverdue && overdueCount > 0 ? overdueCount : showPorAprobar ? porAprobar : 0
              return (
                <Link
                  key={path}
                  to={path}
                  aria-current={active ? 'page' : undefined}
                  title={expanded ? undefined : itemLabel}
                  className={cn(
                    'flex items-center rounded-xl transition-all duration-150 w-full text-left',
                    expanded ? 'gap-2.5 px-2.5 py-2' : 'justify-center',
                    active
                      ? 'bg-ocean-500 text-white shadow-sm'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                  )}
                  style={!expanded ? { height: 36, width: 36, margin: '0 auto 2px' } : undefined}
                >
                  <div className="relative flex-shrink-0">
                    <Icon size={15} />
                    {!expanded && badge > 0 && (
                      <span aria-hidden="true" className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-0.5 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {badge > 9 ? '9+' : badge}
                      </span>
                    )}
                  </div>
                  <AnimatePresence>
                    {expanded && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-[12.5px] font-medium whitespace-nowrap flex-1 truncate"
                      >
                        {itemLabel}
                      </motion.span>
                    )}
                  </AnimatePresence>
                  {/* El lector oye «Proyectos, 1 vencido» o «Solicitudes, 2 por aprobar»; el número de la burbuja es solo visual. */}
                  <span className="sr-only">
                    {!expanded && itemLabel}
                    {badge > 0 && (showPorAprobar ? `, ${badge} por aprobar` : `, ${badge} ${badge === 1 ? 'vencido' : 'vencidos'}`)}
                  </span>
                  {expanded && badge > 0 && (
                    <span aria-hidden="true" className={cn(
                      'text-xs font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 min-w-[18px] text-center',
                      active ? 'bg-white/20 text-white' : 'bg-red-600 text-white',
                    )}>
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                  {active && expanded && !badge && (
                    <div className="w-1.5 h-1.5 rounded-full bg-white/50 flex-shrink-0" />
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* ── Footer ── */}
      <div className="border-t border-border px-3 pt-2 pb-3 flex-shrink-0 space-y-0.5">

        {/* Dark mode */}
        <button
          onClick={toggleTheme}
          title={isDark ? 'Modo claro' : 'Modo oscuro'}
          className={cn(
            'flex items-center rounded-xl transition-all w-full text-muted-foreground hover:bg-accent hover:text-foreground',
            expanded ? 'gap-2.5 px-2.5 py-2 justify-between' : 'justify-center',
          )}
          style={!expanded ? { height: 36, width: 36, margin: '0 auto 2px' } : undefined}
        >
          <AnimatePresence>
            {expanded && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[12px] whitespace-nowrap">
                {isDark ? 'Modo claro' : 'Modo oscuro'}
              </motion.span>
            )}
          </AnimatePresence>
          {isDark ? <Sun size={14} className="flex-shrink-0" /> : <Moon size={14} className="flex-shrink-0" />}
        </button>

        {/* Cerrar sesión */}
        <button
          onClick={logout}
          title={expanded ? undefined : 'Cerrar sesión'}
          className={cn(
            'flex items-center rounded-xl transition-all w-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive',
            expanded ? 'gap-2.5 px-2.5 py-2' : 'justify-center',
          )}
          style={!expanded ? { height: 36, width: 36, margin: '0 auto 2px' } : undefined}
        >
          <LogOut size={14} className="flex-shrink-0" />
          <AnimatePresence>
            {expanded && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[12px] whitespace-nowrap">
                Cerrar sesión
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        {/* Separador */}
        <div className="mx-1 border-t border-border my-1" />

        {/* Usuario */}
        <button
          onClick={() => user && navigate(`/users/${user.user_ID}`)}
          className={cn(
            'flex items-center w-full rounded-xl border border-border bg-muted/40',
            'hover:bg-accent hover:border-accent-foreground/10 transition-all text-left',
            expanded ? 'gap-3 px-3 py-2.5' : 'justify-center p-2',
          )}
        >
          {user?.user_photo ? (
            <img src={user.user_photo} alt="" className="w-8 h-8 rounded-xl object-cover flex-shrink-0" />
          ) : (
            <div className="w-8 h-8 rounded-xl bg-amber-700 flex items-center justify-center flex-shrink-0 text-xs font-bold text-white">
              {user ? getInitials(user.first_name, user.last_name) : '?'}
            </div>
          )}
          <AnimatePresence>
            {expanded && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-foreground truncate">
                  {user?.first_name || user?.last_name
                    ? `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim()
                    : user?.email ?? 'Usuario'}
                </p>
                <p className="text-xs text-muted-foreground truncate">{user?.role || 'Ver perfil'}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </button>

        {/* Colapsar */}
        {!enCajon && (
          <button
            onClick={() => setExpanded(v => !v)}
            title={expanded ? 'Colapsar' : 'Expandir'}
            className={cn(
              'flex items-center rounded-xl transition-all w-full text-muted-foreground hover:bg-accent hover:text-foreground',
              expanded ? 'gap-2 px-2.5 py-1.5 justify-between' : 'justify-center',
            )}
            style={!expanded ? { height: 32, width: 36, margin: '0 auto' } : undefined}
          >
            <AnimatePresence>
              {expanded && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-xs whitespace-nowrap">
                  v2.0 · Muni
                </motion.span>
              )}
            </AnimatePresence>
            {expanded ? <ChevronLeft size={13} /> : <ChevronRight size={13} />}
          </button>
        )}
      </div>
    </motion.aside>
  )
}
