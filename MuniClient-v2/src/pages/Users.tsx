import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, Search, LayoutList, LayoutGrid, RefreshCw,
  Plus, X, ChevronDown,
} from 'lucide-react'
import { getUsuariosPagina, getDepartments, getRoles } from '@/lib/api'
import { type User, type Department, type Role } from '@/types'
import { cn, getInitials, fullName } from '@/lib/utils'
import ErrorDeCarga from '@/components/common/ErrorDeCarga'
import { useValorDiferido } from '@/hooks/useValorDiferido'
import { useTituloDePagina } from '@/hooks/useMarca'

const ROLE_STYLE: Record<string, string> = {
  'Administrador': 'bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400',
  'Alcalde':       'bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-400',
  'Supervisor':    'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
  'Empleado':      'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  'Técnico':       'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
}

const AVATAR_COLORS = [
  'bg-ocean-500', 'bg-purple-700', 'bg-emerald-700', 'bg-amber-700',
  'bg-cyan-700', 'bg-rose-700', 'bg-indigo-600', 'bg-teal-700',
]

function avatarColor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

function UserAvatar({ user, size = 'md' }: { user: User; size?: 'md' | 'lg' }) {
  const initials = getInitials(user.first_name, user.last_name)
  const color    = avatarColor(user.first_name + user.last_name)
  const dim      = size === 'lg' ? 'w-14 h-14 text-lg rounded-2xl' : 'w-9 h-9 text-sm rounded-xl'

  if (user.user_photo) {
    return (
      <img
        src={user.user_photo}
        alt={fullName(user)}
        className={cn(dim, 'object-cover flex-shrink-0')}
      />
    )
  }

  return (
    <div className={cn(dim, color, 'flex items-center justify-center flex-shrink-0 text-white font-bold')}>
      {initials}
    </div>
  )
}

function UserListRow({ user }: { user: User }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="relative focus-within:ring-2 focus-within:ring-inset focus-within:ring-ring flex items-center gap-4 px-5 py-3.5 hover:bg-accent/50 transition-colors cursor-pointer border-b border-border last:border-0 group"
    >
      <UserAvatar user={user} size="md" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground group-hover:text-ocean-500 dark:group-hover:text-ocean-200 transition-colors truncate">
          <Link to={`/users/${user.user_ID}`} className="after:absolute after:inset-0 after:content-[''] focus:outline-none">{fullName(user)}</Link>
        </p>
        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
      </div>
      <div className="hidden md:block flex-shrink-0 min-w-0 max-w-40">
        <p className="text-xs text-muted-foreground truncate">{user.departamento_ID?.name ?? '—'}</p>
      </div>
      {user.role?.name && (
        <span className={cn(
          'flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full hidden sm:block',
          ROLE_STYLE[user.role.name] ?? 'bg-muted text-muted-foreground',
        )}>
          {user.role.name}
        </span>
      )}
    </motion.div>
  )
}

function UserGridCard({ user }: { user: User }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="relative focus-within:ring-2 focus-within:ring-inset focus-within:ring-ring bg-card border border-border rounded-2xl p-4 cursor-pointer hover:border-ocean-200 dark:hover:border-ocean-500/30 hover:shadow-md transition-all group flex flex-col items-center text-center gap-3"
    >
      <UserAvatar user={user} size="lg" />
      <div className="min-w-0 w-full">
        <p className="text-sm font-semibold text-foreground group-hover:text-ocean-500 dark:group-hover:text-ocean-200 transition-colors truncate">
          <Link to={`/users/${user.user_ID}`} className="after:absolute after:inset-0 after:content-[''] focus:outline-none">{fullName(user)}</Link>
        </p>
        <p className="text-xs text-muted-foreground truncate mt-0.5">{user.email}</p>
        {user.departamento_ID?.name && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">{user.departamento_ID.name}</p>
        )}
      </div>
      {user.role?.name && (
        <span className={cn(
          'text-xs font-semibold px-2.5 py-0.5 rounded-full',
          ROLE_STYLE[user.role.name] ?? 'bg-muted text-muted-foreground',
        )}>
          {user.role.name}
        </span>
      )}
    </motion.div>
  )
}

export default function UsersPage() {
  useTituloDePagina('Usuarios')
  const navigate = useNavigate()
  const [search, setSearch]   = useState('')
  const [roleFilter, setRole] = useState('')
  const [deptFilter, setDept] = useState('')
  const [view, setView]       = useState<'list' | 'grid'>('list')
  const [pagina, setPagina]   = useState(1)

  // Búsqueda, filtros y páginas en el servidor (antes se bajaban los primeros 200).
  const busqueda = useValorDiferido(search.trim())
  const filtros = {
    ...(busqueda && { search: busqueda }),
    ...(roleFilter && { rol: roleFilter }),
    ...(deptFilter && { departamento: deptFilter }),
  }
  const POR_PAGINA = 48
  const { data: paginaActual, isLoading, refetch, isError, error, isPlaceholderData } = useQuery({
    queryKey: ['users', 'lista', filtros, pagina],
    queryFn: () => getUsuariosPagina({ ...filtros, page: pagina, page_size: POR_PAGINA }),
    placeholderData: keepPreviousData,
  })
  const displayed = paginaActual?.results ?? []
  const total = paginaActual?.count ?? 0
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA))
  const { data: rolesDisponibles = [] } = useQuery<Role[]>({ queryKey: ['roles'], queryFn: getRoles })

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: getDepartments,
  })

  const roles = rolesDisponibles.map(r => r.name)

  const hasFilters = !!search || !!roleFilter || !!deptFilter
  const clearFilters = () => { setSearch(''); setRole(''); setDept(''); setPagina(1) }

  if (isError) return <ErrorDeCarga error={error} onReintentar={refetch} que="los usuarios" />

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ── */}
      <div className="bg-card border-b border-border px-4 sm:px-6 py-3 flex flex-wrap items-center gap-3 flex-shrink-0" style={{ minHeight: 72 }}>
        <div className="w-9 h-9 rounded-xl bg-ocean-500 flex items-center justify-center flex-shrink-0">
          <Users size={16} className="text-white" />
        </div>
        <div className="flex-1">
          <h1 className="text-base font-bold text-foreground">Usuarios</h1>
          {!isLoading && (
            <p className="text-xs text-muted-foreground">{total} {hasFilters ? 'con estos filtros' : `registrado${total !== 1 ? 's' : ''}`}</p>
          )}
        </div>
        {!isLoading && (
          <span className="hidden sm:flex items-center justify-center px-3 py-1 bg-muted rounded-full text-xs font-bold text-foreground">
            {total}
          </span>
        )}
      </div>

      {/* ── Toolbar ── */}
      <div className="bg-card border-b border-border px-4 sm:px-6 flex items-center gap-2 flex-shrink-0 flex-wrap py-2" style={{ minHeight: 52 }}>
        <div className="relative w-full sm:w-56 sm:flex-shrink-0">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPagina(1) }}
            placeholder="Buscar usuarios..."
            aria-label="Buscar usuarios"
            className="w-full pl-9 pr-8 py-1.5 text-sm bg-background border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
          />
          {search && (
            <button aria-label="Borrar la búsqueda" onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X size={12} />
            </button>
          )}
        </div>

        <div className="relative flex-shrink-0">
          <select
            aria-label="Filtrar por rol"
            value={roleFilter}
            onChange={e => { setRole(e.target.value); setPagina(1) }}
            className="pl-2.5 pr-6 py-1.5 text-xs bg-background border border-input rounded-xl text-foreground appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Todos los roles</option>
            {roles.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>

        <div className="relative flex-shrink-0">
          <select
            aria-label="Filtrar por departamento"
            value={deptFilter}
            onChange={e => { setDept(e.target.value); setPagina(1) }}
            className="pl-2.5 pr-6 py-1.5 text-xs bg-background border border-input rounded-xl text-foreground appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Todos los depto.</option>
            {departments.map(d => <option key={d.departamentos_ID} value={d.departamentos_ID}>{d.name}</option>)}
          </select>
          <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>

        {hasFilters && (
          <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors flex-shrink-0">
            <X size={11} /> Limpiar
          </button>
        )}

        <div className="flex-1" />

        {hasFilters && (
          <span className="text-xs text-muted-foreground flex-shrink-0">{total} resultado{total !== 1 ? 's' : ''}</span>
        )}

        <div className="flex border border-border rounded-xl overflow-hidden flex-shrink-0">
          {(['list', 'grid'] as const).map(v => (
            <button
              key={v}
              aria-label={v === 'list' ? 'Vista de lista' : 'Vista de cuadrícula'}
              aria-pressed={view === v}
              onClick={() => setView(v)}
              className={cn('px-2.5 py-1.5 transition-colors', v === 'grid' ? 'border-l border-border' : '',
                view === v ? 'bg-ocean-500 text-white' : 'text-muted-foreground hover:bg-accent')}
            >
              {v === 'list' ? <LayoutList size={13} /> : <LayoutGrid size={13} />}
            </button>
          ))}
        </div>

        <button aria-label="Actualizar" onClick={() => refetch()}
          className="p-1.5 rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground transition-all flex-shrink-0">
          <RefreshCw size={13} />
        </button>

        <button
          onClick={() => navigate('/users/new')}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-ocean-500 hover:bg-ocean-600 text-white text-xs font-semibold rounded-xl transition-all active:scale-[0.98] flex-shrink-0"
        >
          <Plus size={13} /> Crear usuario
        </button>
      </div>

      {/* ── Contenido ── */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
        {isLoading ? (
          <div className={view === 'grid'
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3'
            : 'space-y-2'}>
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-card rounded-xl h-16 animate-pulse border border-border" />
            ))}
          </div>
        ) : displayed.length > 0 ? (
          <AnimatePresence mode="popLayout">
            {view === 'grid' ? (
              <motion.div key="grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {displayed.map(u => <UserGridCard key={u.user_ID} user={u} />)}
              </motion.div>
            ) : (
              <motion.div key="list" className="bg-card rounded-2xl border border-border overflow-hidden">
                {displayed.map(u => <UserListRow key={u.user_ID} user={u} />)}
              </motion.div>
            )}
          </AnimatePresence>
        ) : null}
        {!isLoading && displayed.length > 0 && totalPaginas > 1 && (
          <nav className="flex items-center justify-center gap-3 pt-4 text-xs text-muted-foreground" aria-label="Páginas de usuarios">
            <button onClick={() => { setPagina(pagina - 1); document.querySelector('main')?.scrollTo({ top: 0 }) }} disabled={pagina <= 1 || isPlaceholderData}
              className="px-2.5 py-1 rounded-lg border border-border hover:bg-accent disabled:opacity-40">Anterior</button>
            <span aria-current="page">Página {pagina} de {totalPaginas}</span>
            <button onClick={() => { setPagina(pagina + 1); document.querySelector('main')?.scrollTo({ top: 0 }) }} disabled={pagina >= totalPaginas || isPlaceholderData}
              className="px-2.5 py-1 rounded-lg border border-border hover:bg-accent disabled:opacity-40">Siguiente</button>
          </nav>
        )}
        {isLoading || displayed.length > 0 ? null : (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
            <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
              <Users size={22} className="text-muted-foreground/40" />
            </div>
            <p className="text-sm font-medium text-foreground">Sin resultados</p>
            <p className="text-xs text-muted-foreground">
              {hasFilters ? 'Ningún usuario coincide con los filtros.' : 'No hay usuarios registrados.'}
            </p>
            {hasFilters && (
              <button onClick={clearFilters} className="text-xs text-ocean-500 dark:text-ocean-200 hover:underline">Limpiar filtros</button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
