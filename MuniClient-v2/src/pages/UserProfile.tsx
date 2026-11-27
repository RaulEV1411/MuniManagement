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
  changePassword, getRoles, getDepartments, getDirections, enviarAcceso, getEspecialidades,
} from '@/lib/api'
import { useAppStore } from '@/store/app'
import { type User, type Project, type Role, type Department, type Direction, type Especialidad } from '@/types'
import { cn, formatDate, getInitials, fullName, isOverdue } from '@/lib/utils'
import { mensajeDeError } from '@/lib/errores'
import ErrorDeCarga from '@/components/common/ErrorDeCarga'
import { esNoEncontrado } from '@/lib/errores'
import { claseEtiqueta, claseRelleno, colorDeEstado, conColor } from '@/lib/colores'
import { useTituloDePagina } from '@/hooks/useMarca'
import Dialogo from '@/components/common/Dialogo'
import { pestanas } from '@/lib/pestanas'
import { usePermiso } from '@/hooks/usePermiso'
import PermisosDeUsuario from '@/components/users/PermisosDeUsuario'
import ActividadDeUsuario from '@/components/users/ActividadDeUsuario'
import MisDatos from '@/components/users/MisDatos'
import DisponibilidadPanel from '@/components/users/DisponibilidadPanel'
import { TIPOS_IDENTIFICACION, formatearIdentificacion } from '@/lib/identificacion'


const AVATAR_COLORS = [
  'bg-ocean-500', 'bg-purple-700', 'bg-emerald-700', 'bg-amber-700',
  'bg-cyan-700', 'bg-rose-700', 'bg-indigo-600', 'bg-teal-700',
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
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-sm text-foreground mt-0.5">{value ?? '—'}</p>
      </div>
    </div>
  )
}

function EditModal({
  user,
  roles,
  departments,
  especialidades,
  puedeEditarTodo,
  onClose,
  onSaved,
}: {
  user: User
  roles: Role[]
  puedeEditarTodo: boolean
  departments: Department[]
  especialidades: Especialidad[]
  onClose: () => void
  onSaved: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    first_name:    user.first_name,
    last_name:     user.last_name,
    tipo_identificacion: user.tipo_identificacion ?? 'fisica',
    cedula:        String(user.cedula ?? ''),
    email:         user.email,
    phone_number:  String(user.phone_number ?? ''),
    puesto:        user.puesto ?? '',
    role:          user.role?.role_ID ?? '',
    departamento_ID: user.departamento_ID?.departamentos_ID ?? '',
    numero_empleado: user.numero_empleado ?? '',
    fecha_ingreso: user.fecha_ingreso ?? '',
    extension: user.extension ?? '',
  })
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))
  const [misEspecialidades, setMisEspecialidades] = useState<string[]>((user.especialidades ?? []).map(e => e.especialidad_ID))
  const alternar = (id: string) => setMisEspecialidades(l => l.includes(id) ? l.filter(x => x !== id) : [...l, id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await updateUser(user.user_ID, {
        first_name:   form.first_name,
        last_name:    form.last_name,
        phone_number: form.phone_number.trim(),
        puesto:       form.puesto,
        extension:    form.extension.trim(),
        especialidades: misEspecialidades,
        // Cédula, correo, rol, departamento, número de empleado e ingreso solo los cambia quien gestiona.
        ...(puedeEditarTodo && {
          tipo_identificacion: form.tipo_identificacion,
          cedula:          form.cedula.trim(),
          email:           form.email,
          role:            form.role || undefined,
          departamento_ID: form.departamento_ID || undefined,
          numero_empleado: form.numero_empleado.trim(),
          fecha_ingreso:   form.fecha_ingreso || null,
        }),
      })
      toast.success('Usuario actualizado')
      onSaved()
      onClose()
    } catch (err) {
      toast.error(mensajeDeError(err, 'Error al actualizar usuario'))
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'w-full px-3 py-2 text-sm bg-background border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'

  return (
    <Dialogo titulo="Editar usuario" onCerrar={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <h2 className="text-base font-bold text-foreground">Editar usuario</h2>
          <button aria-label="Cerrar" onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground transition-colors">
            <X size={15} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-3 overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="userprofile-nombre" className="text-xs font-semibold text-muted-foreground">Nombre</label>
              <input id="userprofile-nombre" value={form.first_name} onChange={e => set('first_name', e.target.value)} className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="userprofile-apellido" className="text-xs font-semibold text-muted-foreground">Apellido</label>
              <input id="userprofile-apellido" value={form.last_name} onChange={e => set('last_name', e.target.value)} className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="userprofile-tipo-id" className="text-xs font-semibold text-muted-foreground">Tipo de identificación</label>
              <select id="userprofile-tipo-id" value={form.tipo_identificacion} onChange={e => set('tipo_identificacion', e.target.value)} disabled={!puedeEditarTodo} className={cn(inputCls, 'disabled:opacity-60')}>
                {TIPOS_IDENTIFICACION.map(t => <option key={t.codigo} value={t.codigo}>{t.nombre}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="userprofile-cedula" className="text-xs font-semibold text-muted-foreground">Número</label>
              <input id="userprofile-cedula" autoComplete="off" value={form.cedula} onChange={e => set('cedula', e.target.value)} disabled={!puedeEditarTodo} className={cn(inputCls, 'disabled:opacity-60')} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="userprofile-correo-electronico" className="text-xs font-semibold text-muted-foreground">Correo electrónico</label>
            <input id="userprofile-correo-electronico" type="email" value={form.email} onChange={e => set('email', e.target.value)} disabled={!puedeEditarTodo} className={cn(inputCls, 'disabled:opacity-60')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="userprofile-telefono" className="text-xs font-semibold text-muted-foreground">Teléfono</label>
              <input id="userprofile-telefono" type="tel" autoComplete="off" value={form.phone_number} onChange={e => set('phone_number', e.target.value)} className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="userprofile-puesto" className="text-xs font-semibold text-muted-foreground">Puesto</label>
              <input id="userprofile-puesto" value={form.puesto} onChange={e => set('puesto', e.target.value)} className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="userprofile-numero-empleado" className="text-xs font-semibold text-muted-foreground">N.º de empleado</label>
              <input id="userprofile-numero-empleado" maxLength={20} value={form.numero_empleado} onChange={e => set('numero_empleado', e.target.value)} disabled={!puedeEditarTodo} className={cn(inputCls, 'disabled:opacity-60')} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="userprofile-ingreso" className="text-xs font-semibold text-muted-foreground">Ingreso</label>
              <input id="userprofile-ingreso" type="date" value={form.fecha_ingreso} onChange={e => set('fecha_ingreso', e.target.value)} disabled={!puedeEditarTodo} className={cn(inputCls, 'disabled:opacity-60')} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="userprofile-extension" className="text-xs font-semibold text-muted-foreground">Extensión</label>
              <input id="userprofile-extension" inputMode="numeric" maxLength={10} value={form.extension} onChange={e => set('extension', e.target.value)} className={inputCls} />
            </div>
          </div>
          {especialidades.length > 0 && (
            <fieldset className="space-y-1.5">
              <legend className="text-xs font-semibold text-muted-foreground mb-1.5">Especialidades</legend>
              <div className="flex flex-wrap gap-1.5">
                {especialidades.map(e => (
                  <label key={e.especialidad_ID} className={cn('flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs cursor-pointer',
                    misEspecialidades.includes(e.especialidad_ID) ? 'border-ocean-500 bg-ocean-500/10 text-foreground' : 'border-border text-muted-foreground')}>
                    <input type="checkbox" className="accent-ocean-500" checked={misEspecialidades.includes(e.especialidad_ID)} onChange={() => alternar(e.especialidad_ID)} />
                    {e.name}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="userprofile-rol" className="text-xs font-semibold text-muted-foreground">Rol</label>
              <select id="userprofile-rol" value={form.role} onChange={e => set('role', e.target.value)} disabled={!puedeEditarTodo} className={cn(inputCls, 'disabled:opacity-60')}>
                <option value="">Sin rol</option>
                {roles.map(r => <option key={r.role_ID} value={r.role_ID}>{r.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="userprofile-departamento" className="text-xs font-semibold text-muted-foreground">Departamento</label>
              <select id="userprofile-departamento" value={form.departamento_ID} onChange={e => set('departamento_ID', e.target.value)} disabled={!puedeEditarTodo} className={cn(inputCls, 'disabled:opacity-60')}>
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
    </Dialogo>
  )
}

function PasswordModal({ onClose }: { onClose: () => void }) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ current: '', next: '', confirm: '' })
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.next !== form.confirm) { toast.error('Las contraseñas no coinciden'); return }
    if (form.next.length < 8) { toast.error('La contraseña debe tener al menos 8 caracteres'); return }
    setLoading(true)
    try {
      await changePassword(form.current, form.next)
      toast.success('Contraseña actualizada')
      onClose()
    } catch (err) {
      toast.error(mensajeDeError(err, 'No se pudo cambiar la contraseña. Revise la contraseña actual.'))
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'w-full px-3 py-2 text-sm bg-background border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'

  return (
    <Dialogo titulo="Cambiar contraseña" onCerrar={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-2xl"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-bold text-foreground">Cambiar contraseña</h2>
          <button aria-label="Cerrar" onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground transition-colors">
            <X size={15} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-3">
          <div className="space-y-1.5">
            <label htmlFor="userprofile-contrasena-actual" className="text-xs font-semibold text-muted-foreground">Contraseña actual</label>
            <input id="userprofile-contrasena-actual" type="password" value={form.current} onChange={e => set('current', e.target.value)} className={inputCls} autoFocus />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="userprofile-nueva-contrasena" className="text-xs font-semibold text-muted-foreground">Nueva contraseña</label>
            <input id="userprofile-nueva-contrasena" type="password" value={form.next} onChange={e => set('next', e.target.value)} className={inputCls} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="userprofile-confirmar-nueva-contrasena" className="text-xs font-semibold text-muted-foreground">Confirmar nueva contraseña</label>
            <input id="userprofile-confirmar-nueva-contrasena" type="password" value={form.confirm} onChange={e => set('confirm', e.target.value)} className={inputCls} />
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
    </Dialogo>
  )
}

const TABS = ['Información', 'Proyectos', 'Actividad'] as const
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
  const yo = useAppStore(s => s.user)
  const esPropio = yo?.user_ID === id
  const gestiona = usePermiso('usuarios.gestionar')
  const veRoles = usePermiso('roles.gestionar')
  const veAuditoria = usePermiso('auditoria.ver')
  const esAdmin = yo?.role === 'Administrador'
  // La actividad (sesiones y acciones) la ve la propia persona y quien tiene la auditoría.
  const veActividad = esPropio || veAuditoria
  const visibles = veActividad ? TABS : TABS.filter(t => t !== 'Actividad')
  const tabs = pestanas('perfil', visibles, tab, setTab)
  // Con el directorio abierto a todos, editar y cambiar la foto quedan para la persona y la alcaldía.
  const puedeEditar = esPropio || gestiona

  const reenviarAcceso = async () => {
    try {
      await enviarAcceso(id!)
      toast.success('Le enviamos un correo con el enlace para definir su contraseña.')
    } catch (err) {
      toast.error(mensajeDeError(err, 'No se pudo reenviar el acceso.'))
    }
  }

  const { data: user, isLoading: loadingUser, isError: errorUser, error: errUser, refetch: refetchUser } = useQuery<User>({
    queryKey: ['user', id],
    queryFn: () => getUserById(id!),
    enabled: !!id,
  })
  useTituloDePagina(user ? `${user.first_name} ${user.last_name}` : 'Usuario')

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
  const { data: directions = [] } = useQuery<Direction[]>({ queryKey: ['directions'], queryFn: getDirections })
  const { data: especialidades = [] } = useQuery<Especialidad[]>({ queryKey: ['especialidades'], queryFn: getEspecialidades })
  // Registra ausencias: la persona, quien la gestiona o su jefatura (también quien la suple). El servidor decide lo exacto.
  const depto = departments.find(d => d.departamentos_ID === user?.departamento_ID?.departamentos_ID)
  const direccion = directions.find(d => d.direccion_ID === (typeof depto?.direccion === 'string' ? depto.direccion : depto?.direccion?.direccion_ID))
  const esJefatura = !!yo && [depto?.jefe, depto?.suplente, direccion?.jefe, direccion?.suplente].includes(yo.user_ID)

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !id) return
    setUploading(true)
    try {
      await uploadUserPhoto(id, file)
      await qc.invalidateQueries({ queryKey: ['user', id] })
      toast.success('Foto actualizada')
    } catch (err) {
      toast.error(mensajeDeError(err, 'Error al subir foto'))
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

  if (errorUser && !esNoEncontrado(errUser)) {
    return <ErrorDeCarga error={errUser} onReintentar={refetchUser} que="el usuario" />
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
        <AlertCircle size={32} />
        <p className="text-sm">Usuario no encontrado</p>
        <button onClick={() => navigate(-1)} className="text-xs text-ocean-500 dark:text-ocean-200 hover:underline">Volver</button>
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
      <div className="bg-card border-b border-border px-4 sm:px-6 flex-shrink-0" style={{ minHeight: 72 }}>
        <div className="flex items-center gap-3 py-4">
          <button aria-label="Volver"
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
            {puedeEditar && (
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                aria-label="Cambiar la foto"
                className="absolute inset-0 rounded-xl bg-black/40 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100 flex items-center justify-center transition-opacity"
              >
                <Camera size={12} className="text-white" />
              </button>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-foreground">{fullName(user)}</h1>
            <p className="text-xs text-muted-foreground">{user.puesto ?? user.role?.name ?? 'Usuario'}</p>
          </div>

          {/* Mini stats */}
          <div className="hidden md:flex items-center gap-2">
            {[
              { icon: FolderOpen,   value: totalProjects, label: 'Total',       color: 'text-ocean-500 dark:text-ocean-200' },
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
            {puedeEditar && (
              <button
                onClick={() => setShowEdit(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-ocean-500 hover:bg-ocean-600 text-white text-xs font-semibold rounded-xl transition-all active:scale-[0.98]"
              >
                <Edit2 size={12} /> Editar
              </button>
            )}
            {esPropio && (
              <button
                onClick={() => setPassword(true)}
                className="p-1.5 rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground transition-colors active:scale-[0.98]"
                title="Cambiar mi contraseña"
                aria-label="Cambiar mi contraseña"
              >
                <Lock size={14} />
              </button>
            )}
            {!esPropio && gestiona && (
              <button
                onClick={reenviarAcceso}
                className="p-1.5 rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground transition-colors active:scale-[0.98]"
                title="Reenviar el enlace de acceso"
                aria-label="Reenviar el enlace de acceso"
              >
                <Mail size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto" {...tabs.lista} aria-label="Secciones del perfil">
          {visibles.map(t => (
            <button
              key={t}
              {...tabs.pestana(t)}
              className={cn(
                'px-4 py-2 text-xs font-semibold border-b-2 transition-all whitespace-nowrap flex-shrink-0',
                tab === t ? 'border-ocean-500 text-ocean-500 dark:text-ocean-200' : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {t}
              {t === 'Proyectos' && totalProjects > 0 && (
                <span className="ml-1.5 text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">{totalProjects}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Contenido ── */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            {...tabs.panel}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
          >
            {tab === 'Información' && (
              <div className="max-w-xl space-y-4">
                <div className="bg-card border border-border rounded-2xl p-4">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-1">{puedeEditar ? 'Datos personales' : 'Datos'}</h3>
                  {/* Cédula, cumpleaños y teléfono solo los ven la persona y la alcaldía (el servidor ni los manda). */}
                  {puedeEditar && <InfoRow icon={CreditCard} label="Identificación" value={formatearIdentificacion(user.tipo_identificacion, user.cedula)} />}
                  {puedeEditar && <InfoRow icon={Calendar}   label="Cumpleaños"  value={formatDate(user.birthday)} />}
                  <InfoRow icon={Shield}     label="Rol"         value={user.role?.name} />
                  <InfoRow icon={Building2}  label="Departamento" value={user.departamento_ID?.name} />
                </div>
                <div className="bg-card border border-border rounded-2xl p-4">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-1">Contacto</h3>
                  <InfoRow icon={Mail}       label="Correo electrónico" value={user.email} />
                  {puedeEditar && <InfoRow icon={Phone}      label="Teléfono" value={user.phone_number || null} />}
                  <InfoRow icon={Phone}      label="Extensión" value={user.extension || null} />
                  <InfoRow icon={Briefcase}  label="Puesto"   value={user.puesto} />
                </div>
                <div className="bg-card border border-border rounded-2xl p-4">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-1">Empleo</h3>
                  {/* Número e ingreso solo llegan en la ficha completa. */}
                  {user.numero_empleado !== undefined && <InfoRow icon={CreditCard} label="N.º de empleado" value={user.numero_empleado || null} />}
                  {user.fecha_ingreso !== undefined && <InfoRow icon={Calendar} label="Ingreso" value={user.fecha_ingreso ? formatDate(user.fecha_ingreso) : null} />}
                  <div className="py-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Especialidades</p>
                    {user.especialidades?.length ? (
                      <ul className="flex flex-wrap gap-1.5">
                        {user.especialidades.map(e => <li key={e.especialidad_ID} className="text-xs px-2 py-0.5 rounded-full bg-muted text-foreground">{e.name}</li>)}
                      </ul>
                    ) : <p className="text-sm text-muted-foreground">—</p>}
                  </div>
                </div>
                <DisponibilidadPanel usuario={user} puedeRegistrar={esPropio || gestiona || esJefatura} />
                {(esPropio || gestiona || veRoles) && <PermisosDeUsuario usuarioId={user.user_ID} />}
                {(esPropio || esAdmin) && <MisDatos usuario={user} propio={esPropio} esAdmin={esAdmin} />}
              </div>
            )}

            {tab === 'Actividad' && veActividad && (
              <ActividadDeUsuario usuarioId={user.user_ID} veAuditoria={veAuditoria} />
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
                        <div className={cn('w-1 h-8 rounded-full flex-shrink-0', claseRelleno)} style={conColor(colorDeEstado(overdue, p.estado_ID))} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground group-hover:text-ocean-500 dark:group-hover:text-ocean-200 transition-colors truncate">{p.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{p.departamento_ID?.name} · {formatDate(p.fecha_entrega)}</p>
                        </div>
                        {status && (
                          <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0', claseEtiqueta)} style={conColor(colorDeEstado(overdue, p.estado_ID))}>
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
            especialidades={especialidades}
            puedeEditarTodo={gestiona}
            onClose={() => setShowEdit(false)}
            onSaved={() => qc.invalidateQueries({ queryKey: ['user', id] })}
          />
        )}
        {showPassword && <PasswordModal onClose={() => setPassword(false)} />}
      </AnimatePresence>
    </div>
  )
}
