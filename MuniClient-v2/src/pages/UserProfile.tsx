import { useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Camera, Edit2, Lock, Mail, Phone, Briefcase,
  CreditCard, Calendar, Building2, Shield, FolderOpen,
  AlertCircle, CheckCircle2, Clock, X,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  getUserById, getProjectsByUser, updateUser, uploadUserPhoto,
  changePassword, getRoles, getDepartments,
} from '@/lib/api'
import { type User, type Project, type Role, type Department } from '@/types'
import { cn, formatDate, getInitials, fullName, isOverdue } from '@/lib/utils'

const STATUS_STYLE: Record<string, string> = {
  'Completado':  'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  'En progreso': 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
  'Pendiente':   'bg-muted text-muted-foreground',
  'Cancelado':   'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400',
}

const AVATAR_COLORS = [
  'bg-ocean-500', 'bg-sunset-500', 'bg-purple-500', 'bg-emerald-500',
  'bg-amber-500', 'bg-cyan-500', 'bg-rose-500', 'bg-indigo-500',
]

function avatarColor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | number | null }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-0">
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon size={13} className="text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-sm text-foreground mt-0.5">{value ?? '—'}</p>
      </div>
    </div>
  )
}

function EditModal({
  user,
  roles,
  departments,
  onClose,
  onSaved,
}: {
  user: User
  roles: Role[]
  departments: Department[]
  onClose: () => void
  onSaved: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    first_name:    user.first_name,
    last_name:     user.last_name,
    cedula:        String(user.cedula ?? ''),
    email:         user.email,
    phone_number:  String(user.phone_number ?? ''),
    puesto:        user.puesto ?? '',
    role:          user.role?.role_ID ?? '',
    departamento_ID: user.departamento_ID?.departamentos_ID ?? '',
  })
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await updateUser(user.user_ID, {
        first_name:   form.first_name,
        last_name:    form.last_name,
        cedula:       form.cedula ? parseInt(form.cedula) : undefined,
        email:        form.email,
        phone_number: form.phone_number ? parseInt(form.phone_number) : undefined,
        puesto:       form.puesto,
        role:         form.role || undefined,
        departamento_ID: form.departamento_ID || undefined,
      })
      toast.success('Usuario actualizado')
      onSaved()
      onClose()
    } catch {
      toast.error('Error al actualizar usuario')
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'w-full px-3 py-2 text-sm bg-background border border-input rounded-xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <h2 className="text-base font-bold text-foreground">Editar usuario</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground transition-colors">
            <X size={15} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-3 overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Nombre</label>
              <input value={form.first_name} onChange={e => set('first_name', e.target.value)} className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Apellido</label>
              <input value={form.last_name} onChange={e => set('last_name', e.target.value)} className={inputCls} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Cédula</label>
            <input type="number" value={form.cedula} onChange={e => set('cedula', e.target.value)} className={inputCls} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Email</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Teléfono</label>
              <input type="number" value={form.phone_number} onChange={e => set('phone_number', e.target.value)} className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Puesto</label>
              <input value={form.puesto} onChange={e => set('puesto', e.target.value)} className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Rol</label>
              <select value={form.role} onChange={e => set('role', e.target.value)} className={inputCls}>
                <option value="">Sin rol</option>
                {roles.map(r => <option key={r.role_ID} value={r.role_ID}>{r.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Departamento</label>
              <select value={form.departamento_ID} onChange={e => set('departamento_ID', e.target.value)} className={inputCls}>
                <option value="">Sin departamento</option>
                {departments.map(d => <option key={d.departamentos_ID} value={d.departamentos_ID}>{d.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-muted-foreground hover:bg-accent rounded-xl transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="px-4 py-2 text-sm font-semibold bg-ocean-500 hover:bg-ocean-600 text-white rounded-xl transition-all active:scale-[0.98] disabled:opacity-60">
              {loading ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

function PasswordModal({ onClose }: { onClose: () => void }) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ current: '', next: '', confirm: '' })
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.next !== form.confirm) { toast.error('Las contraseñas no coinciden'); return }
    if (form.next.length < 6) { toast.error('La contraseña debe tener al menos 6 caracteres'); return }
    setLoading(true)
    try {
      await changePassword(form.current, form.next)
      toast.success('Contraseña actualizada')
      onClose()
    } catch {
      toast.error('Error al cambiar contraseña — verifica la contraseña actual')
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'w-full px-3 py-2 text-sm bg-background border border-input rounded-xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-2xl"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-bold text-foreground">Cambiar contraseña</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground transition-colors">
            <X size={15} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Contraseña actual</label>
            <input type="password" value={form.current} onChange={e => set('current', e.target.value)} className={inputCls} autoFocus />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Nueva contraseña</label>
            <input type="password" value={form.next} onChange={e => set('next', e.target.value)} className={inputCls} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Confirmar nueva contraseña</label>
            <input type="password" value={form.confirm} onChange={e => set('confirm', e.target.value)} className={inputCls} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-muted-foreground hover:bg-accent rounded-xl transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="px-4 py-2 text-sm font-semibold bg-ocean-500 hover:bg-ocean-600 text-white rounded-xl transition-all active:scale-[0.98] disabled:opacity-60">
              {loading ? 'Guardando...' : 'Cambiar contraseña'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

const TABS = ['Información', 'Proyectos'] as const
type Tab = typeof TABS[number]

export default function UserProfilePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const [tab, setTab]         = useState<Tab>('Información')
  const [showEdit, setShowEdit]     = useState(false)
  const [showPassword, setPassword] = useState(false)
  const [uploading, setUploading]   = useState(false)

  const { data: user, isLoading: loadingUser } = useQuery<User>({
    queryKey: ['user', id],
    queryFn: () => getUserById(id!),
    enabled: !!id,
  })

  const { data: projects = [], isLoading: loadingProjects } = useQuery<Project[]>({
    queryKey: ['user-projects', id],
    queryFn: () => getProjectsByUser(id!),
    enabled: !!id,
  })

  const { data: roles = [] } = useQuery<Role[]>({
    queryKey: ['roles'],
    queryFn: getRoles,
  })

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: getDepartments,
  })

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !id) return
    setUploading(true)
    try {
      await uploadUserPhoto(id, file)
      await qc.invalidateQueries({ queryKey: ['user', id] })
      toast.success('Foto actualizada')
    } catch {
      toast.error('Error al subir foto')
    } finally {
      setUploading(false)
    }
  }

  if (loadingUser) {
    return (
      <div className="flex flex-col h-full animate-pulse">
        <div className="h-[72px] bg-card border-b border-border" />
        <div className="p-6 space-y-4">
          {[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-muted rounded-xl" />)}
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
        <AlertCircle size={32} />
        <p className="text-sm">Usuario no encontrado</p>
        <button onClick={() => navigate(-1)} className="text-xs text-ocean-500 hover:underline">Volver</button>
      </div>
    )
  }

  const totalProjects     = projects.length
  const inProgress        = projects.filter(p => p.estado_ID?.name === 'En progreso').length
  const completed         = projects.filter(p => p.estado_ID?.name === 'Completado').length
  const initials          = getInitials(user.first_name, user.last_name)
  const color             = avatarColor(user.first_name + user.last_name)

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ── */}
      <div className="bg-card border-b border-border px-6 flex-shrink-0" style={{ minHeight: 72 }}>
        <div className="flex items-center gap-3 py-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground transition-colors flex-shrink-0 active:scale-[0.98]"
          >
            <ArrowLeft size={16} />
          </button>

          {/* Avatar */}
          <div className="relative flex-shrink-0 group">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            {user.user_photo ? (
              <img src={user.user_photo} alt={fullName(user)}
                className="w-10 h-10 rounded-xl object-cover" />
            ) : (
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white', color)}>
                {initials}
              </div>
            )}
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute inset-0 rounded-xl bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
            >
              <Camera size={12} className="text-white" />
            </button>
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-foreground">{fullName(user)}</h1>
            <p className="text-xs text-muted-foreground">{user.puesto ?? user.role?.name ?? 'Usuario'}</p>
          </div>

          {/* Mini stats */}
          <div className="hidden md:flex items-center gap-2">
            {[
              { icon: FolderOpen,   value: totalProjects, label: 'Total',       color: 'text-ocean-500' },
              { icon: Clock,        value: inProgress,    label: 'En progreso', color: 'text-blue-500' },
              { icon: CheckCircle2, value: completed,     label: 'Completados', color: 'text-emerald-500' },
            ].map(({ icon: Icon, value, label, color: c }) => (
              <div key={label} className="flex items-center gap-1.5 px-3 py-1.5 bg-muted rounded-xl text-xs">
                <Icon size={11} className={c} />
                <span className="font-bold text-foreground">{value}</span>
                <span className="text-muted-foreground hidden xl:block">{label}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={() => setShowEdit(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-ocean-500 hover:bg-ocean-600 text-white text-xs font-semibold rounded-xl transition-all active:scale-[0.98]"
            >
              <Edit2 size={12} /> Editar
            </button>
            <button
              onClick={() => setPassword(true)}
              className="p-1.5 rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground transition-colors active:scale-[0.98]"
              title="Cambiar contraseña"
            >
              <Lock size={14} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'px-4 py-2 text-xs font-semibold border-b-2 transition-all',
                tab === t ? 'border-ocean-500 text-ocean-500' : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {t}
              {t === 'Proyectos' && totalProjects > 0 && (
                <span className="ml-1.5 text-[9px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">{totalProjects}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Contenido ── */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
          >
            {tab === 'Información' && (
              <div className="max-w-xl space-y-4">
                <div className="bg-card border border-border rounded-2xl p-4">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-1">Datos personales</h3>
                  <InfoRow icon={CreditCard} label="Cédula"      value={user.cedula} />
                  <InfoRow icon={Calendar}   label="Cumpleaños"  value={formatDate(user.birthday)} />
                  <InfoRow icon={Shield}     label="Rol"         value={user.role?.name} />
                  <InfoRow icon={Building2}  label="Departamento" value={user.departamento_ID?.name} />
                </div>
                <div className="bg-card border border-border rounded-2xl p-4">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-1">Contacto</h3>
                  <InfoRow icon={Mail}       label="Email"    value={user.email} />
                  <InfoRow icon={Phone}      label="Teléfono" value={user.phone_number ? String(user.phone_number) : null} />
                  <InfoRow icon={Briefcase}  label="Puesto"   value={user.puesto} />
                </div>
              </div>
            )}

            {tab === 'Proyectos' && (
              <div className="max-w-2xl space-y-2">
                {loadingProjects ? (
                  [...Array(4)].map((_, i) => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)
                ) : projects.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
                      <FolderOpen size={20} className="text-muted-foreground/40" />
                    </div>
                    <p className="text-sm text-muted-foreground">Sin proyectos asignados</p>
                  </div>
                ) : (
                  projects.map(p => {
                    const overdue = isOverdue(p)
                    const status  = overdue ? 'Vencido' : p.estado_ID?.name
                    return (
                      <button
                        key={p.proyect_ID}
                        onClick={() => navigate(`/projects/${p.proyect_ID}`)}
                        className="w-full flex items-center gap-4 px-4 py-3.5 bg-card border border-border rounded-xl hover:border-ocean-200 dark:hover:border-ocean-500/30 transition-all text-left group active:scale-[0.99]"
                      >
                        <div className={cn(
                          'w-1 h-8 rounded-full flex-shrink-0',
                          overdue ? 'bg-red-400' :
                          status === 'En progreso' ? 'bg-blue-400' :
                          status === 'Completado'  ? 'bg-emerald-400' :
                          status === 'Cancelado'   ? 'bg-red-300' : 'bg-muted-foreground/30',
                        )} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground group-hover:text-ocean-500 transition-colors truncate">{p.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{p.departamento_ID?.name} · {formatDate(p.fecha_entrega)}</p>
                        </div>
                        {status && (
                          <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0', STATUS_STYLE[status] ?? 'bg-muted text-muted-foreground')}>
                            {status}
                          </span>
                        )}
                      </button>
                    )
                  })
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Modales ── */}
      <AnimatePresence>
        {showEdit && (
          <EditModal
            user={user}
            roles={roles}
            departments={departments}
            onClose={() => setShowEdit(false)}
            onSaved={() => qc.invalidateQueries({ queryKey: ['user', id] })}
          />
        )}
        {showPassword && <PasswordModal onClose={() => setPassword(false)} />}
      </AnimatePresence>
    </div>
  )
}
