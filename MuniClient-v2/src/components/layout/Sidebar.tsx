import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Users, Building2, GitBranch,
  LogOut, Moon, Sun, ChevronLeft, ChevronRight,
  MapPin, Sliders, GanttChartSquare, FileDown, HelpCircle,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { getProjects } from '@/lib/api'
import { isOverdue } from '@/lib/utils'
import { type Project } from '@/types'
import { cn, getInitials } from '@/lib/utils'
import { useAppStore } from '@/store/app'

const NAV = [
  {
    label: 'Principal',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard',     path: '/dashboard',   match: (p: string) => p === '/dashboard' || p.startsWith('/projects'), showOverdue: true },
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
      { icon: GanttChartSquare, label: 'Timeline', path: '/timeline', match: (p: string) => p === '/timeline' },
      { icon: FileDown,         label: 'Reportes', path: '/reports',  match: (p: string) => p === '/reports' },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { icon: Sliders,     label: 'Configuración', path: '/config', match: (p: string) => p === '/config' },
      { icon: HelpCircle,  label: 'Ayuda',         path: '/ayuda',  match: (p: string) => p === '/ayuda' },
    ],
  },
]

export default function Sidebar() {
  const [expanded, setExpanded] = useState(true)
  const { isDark, toggleTheme, user, logout } = useAppStore()
  const navigate = useNavigate()
  const location = useLocation()

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: getProjects,
    staleTime: 60_000,
  })
  const overdueCount = projects.filter(isOverdue).length

  const W = expanded ? 240 : 64

  return (
    <motion.aside
      animate={{ width: W }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className="relative flex flex-col h-full bg-card border-r border-border flex-shrink-0 overflow-hidden"
    >
      {/* ── Logo ── */}
      <div className="flex items-center gap-3 px-4 h-14 border-b border-border flex-shrink-0">
        <div className="w-8 h-8 rounded-xl bg-ocean-500 flex items-center justify-center flex-shrink-0 shadow-sm">
          <MapPin size={16} className="text-white" />
        </div>
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              className="min-w-0"
            >
              <p className="text-[13px] font-bold text-ocean-500 leading-tight whitespace-nowrap">Municipalidad</p>
              <p className="text-[10px] text-muted-foreground whitespace-nowrap">Puntarenas, CR</p>
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
              <kbd className="text-[9px] bg-background border border-border rounded px-1 py-0.5">⌘K</kbd>
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
                  className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest px-2 pt-3 pb-1.5 whitespace-nowrap"
                >
                  {label}
                </motion.p>
              )}
            </AnimatePresence>
            {!expanded && <div className="h-2" />}
            {items.map(({ icon: Icon, label: itemLabel, path, match, showOverdue }) => {
              const active = match(location.pathname)
              const badge = showOverdue && overdueCount > 0 ? overdueCount : 0
              return (
                <button
                  key={path}
                  onClick={() => navigate(path)}
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
                      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
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
                  {expanded && badge > 0 && (
                    <span className={cn(
                      'text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 min-w-[18px] text-center',
                      active ? 'bg-white/20 text-white' : 'bg-red-500 text-white',
                    )}>
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                  {active && expanded && !badge && (
                    <div className="w-1.5 h-1.5 rounded-full bg-white/50 flex-shrink-0" />
                  )}
                </button>
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
            <div className="w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center flex-shrink-0 text-xs font-bold text-white">
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
                <p className="text-[10px] text-muted-foreground truncate">{user?.role || 'Ver perfil'}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </button>

        {/* Colapsar */}
        <button
          onClick={() => setExpanded(v => !v)}
          title={expanded ? 'Colapsar' : 'Expandir'}
          className={cn(
            'flex items-center rounded-xl transition-all w-full text-muted-foreground/50 hover:bg-accent hover:text-muted-foreground',
            expanded ? 'gap-2 px-2.5 py-1.5 justify-between' : 'justify-center',
          )}
          style={!expanded ? { height: 32, width: 36, margin: '0 auto' } : undefined}
        >
          <AnimatePresence>
            {expanded && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[10px] whitespace-nowrap">
                v2.0 · Muni
              </motion.span>
            )}
          </AnimatePresence>
          {expanded ? <ChevronLeft size={13} /> : <ChevronRight size={13} />}
        </button>
      </div>
    </motion.aside>
  )
}
