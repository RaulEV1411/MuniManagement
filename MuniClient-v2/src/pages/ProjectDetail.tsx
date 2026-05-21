import { useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Edit2, Trash2, Plus, ChevronDown, ChevronRight,
  Calendar, DollarSign, Building2, User as UserIcon, Clock, CheckCircle2,
  MessageSquare, AlertCircle, X, ImageIcon, Upload, ZoomIn, Activity, Search,
} from 'lucide-react'
import ImageLightbox from '@/components/common/ImageLightbox'
import { toast } from 'sonner'
import {
  getProjectById, getTasksByProject, getFeedback,
  createTask, updateTask, patchTask, deleteTask, updateProject, patchProject,
  deleteProject, createFeedback, deleteFeedback,
  uploadProjectImage, deleteProjectImage,
  uploadTaskImage, deleteTaskImage,
  getEstados, getPrioridades, getDepartments, getUsers,
  getHistorial,
} from '@/lib/api'
import StatusStepper from '@/components/projects/StatusStepper'
import BudgetSection from '@/components/projects/BudgetSection'
import DelegacionPanel from '@/components/projects/DelegacionPanel'

const ROLES_DELEGADORES = new Set(['Alcalde', 'Vicealcalde', 'Jefe de Dirección', 'Jefe de Departamento'])
import {
  type Project, type Task, type TaskImage, type Feedback,
  type Estado, type Prioridad, type Department, type User as UserModel,
  type HistorialEntry,
} from '@/types'
import { cn, formatDate, daysUntil, isOverdue, fullName } from '@/lib/utils'
import { useAppStore } from '@/store/app'

const STATUS_STYLE: Record<string, string> = {
  'Completado':  'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  'En progreso': 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
  'Pendiente':   'bg-muted text-muted-foreground',
  'Cancelado':   'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400',
}
const PRIORITY_STYLE: Record<string, string> = {
  'Alta':  'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400',
  'Media': 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
  'Baja':  'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
}

const STATUS_DOT: Record<string, string> = {
  'En progreso': 'bg-blue-500',
  'Pendiente':   'bg-muted-foreground/40',
  'Completado':  'bg-emerald-500',
  'Cancelado':   'bg-red-400',
}

const TASK_GROUP_ORDER = ['En progreso', 'Pendiente', 'Completado', 'Cancelado']

// ── Image Grid (reutilizable) ────────────────────────────────────────────────
function ImageGrid({
  images,
  onDelete,
}: {
  images: Array<{ url: string; imagen_ID: string }>
  onDelete: (id: string) => void
}) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {images.map((img, i) => (
          <div
            key={img.imagen_ID}
            className="relative group aspect-square rounded-xl overflow-hidden bg-muted border border-border cursor-zoom-in"
            onClick={() => setLightboxIdx(i)}
          >
            <img
              src={img.url}
              alt=""
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center gap-2">
              <button
                onClick={e => { e.stopPropagation(); setLightboxIdx(i) }}
                className="p-2 rounded-xl bg-white/90 text-foreground opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-white active:scale-95"
                title="Ver imagen"
              >
                <ZoomIn size={12} />
              </button>
              <button
                onClick={e => { e.stopPropagation(); onDelete(img.imagen_ID) }}
                className="p-2 rounded-xl bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-red-600 active:scale-95"
                title="Eliminar imagen"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>
      <AnimatePresence>
        {lightboxIdx !== null && (
          <ImageLightbox
            images={images}
            initialIndex={lightboxIdx}
            onClose={() => setLightboxIdx(null)}
          />
        )}
      </AnimatePresence>
    </>
  )
}

// ── Edit project modal ───────────────────────────────────────────────────────
function EditProjectModal({
  project, estados, prioridades, onClose, onSaved,
}: {
  project: Project
  estados: Estado[]
  prioridades: Prioridad[]
  onClose: () => void
  onSaved: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name:            project.name,
    descripcion:     project.descripcion ?? '',
    fecha_inicio:    project.fecha_inicio ?? '',
    fecha_entrega:   project.fecha_entrega ?? '',
    costo:           String(project.costo ?? ''),
    estado_ID:       project.estado_ID?.estado_ID ?? '',
    prioridad_ID:    project.prioridad_ID?.prioridad_ID ?? '',
    departamento_ID: project.departamento_ID?.departamentos_ID ?? '',
    user_ID:         project.user_ID?.user_ID ?? '',
  })

  const { data: departments = [] } = useQuery<Department[]>({ queryKey: ['departments'], queryFn: getDepartments })
  const { data: users = [] }       = useQuery<UserModel[]>({ queryKey: ['users'], queryFn: getUsers })

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('El nombre es requerido'); return }
    if (form.fecha_inicio && form.fecha_entrega && form.fecha_entrega < form.fecha_inicio) {
      toast.error('La fecha de entrega no puede ser anterior a la de inicio'); return
    }
    setLoading(true)
    try {
      await updateProject(project.proyect_ID, {
        name:            form.name,
        descripcion:     form.descripcion || undefined,
        fecha_inicio:    form.fecha_inicio || undefined,
        fecha_entrega:   form.fecha_entrega || undefined,
        costo:           form.costo ? parseFloat(form.costo) : undefined,
        estado_ID:       form.estado_ID || undefined,
        prioridad_ID:    form.prioridad_ID || undefined,
        departamento_ID: form.departamento_ID || undefined,
        user_ID:         form.user_ID || undefined,
      })
      toast.success('Proyecto actualizado')
      onSaved()
      onClose()
    } catch {
      toast.error('Error al actualizar proyecto')
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
          <h2 className="text-base font-bold text-foreground">Editar proyecto</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground transition-colors">
            <X size={15} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Nombre *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} className={inputCls} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Descripción</label>
            <textarea value={form.descripcion} onChange={e => set('descripcion', e.target.value)} rows={3}
              className={cn(inputCls, 'resize-none')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Fecha inicio</label>
              <input type="date" value={form.fecha_inicio} onChange={e => set('fecha_inicio', e.target.value)} className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Fecha entrega</label>
              <input type="date" value={form.fecha_entrega} min={form.fecha_inicio || undefined} onChange={e => set('fecha_entrega', e.target.value)} className={inputCls} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Costo estimado (₡)</label>
            <input type="number" value={form.costo} onChange={e => set('costo', e.target.value)} placeholder="0" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Estado</label>
              <select value={form.estado_ID} onChange={e => set('estado_ID', e.target.value)} className={inputCls}>
                <option value="">Sin estado</option>
                {estados.map(e => <option key={e.estado_ID} value={e.estado_ID}>{e.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Prioridad</label>
              <select value={form.prioridad_ID} onChange={e => set('prioridad_ID', e.target.value)} className={inputCls}>
                <option value="">Sin prioridad</option>
                {prioridades.map(p => <option key={p.prioridad_ID} value={p.prioridad_ID}>{p.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Departamento</label>
              <select value={form.departamento_ID} onChange={e => set('departamento_ID', e.target.value)} className={inputCls}>
                <option value="">Sin departamento</option>
                {departments.map(d => <option key={d.departamentos_ID} value={d.departamentos_ID}>{d.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Responsable</label>
              <select value={form.user_ID} onChange={e => set('user_ID', e.target.value)} className={inputCls}>
                <option value="">Sin responsable</option>
                {users.map(u => <option key={u.user_ID} value={u.user_ID}>{u.first_name} {u.last_name}</option>)}
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

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
      <span className="text-sm text-foreground">{children}</span>
    </div>
  )
}

// ── Razón modal (genérico) ───────────────────────────────────────────────────
function RazonModal({
  title, description, onConfirm, onClose,
}: {
  title: string
  description?: string
  onConfirm: (razon: string) => void
  onClose: () => void
}) {
  const [razon, setRazon] = useState('')
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-bold text-foreground">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground transition-colors">
            <X size={15} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Motivo *</label>
            <textarea
              value={razon}
              onChange={e => setRazon(e.target.value)}
              rows={3}
              placeholder="Describe el motivo de este cambio..."
              className="w-full px-3 py-2 text-sm bg-background border border-input rounded-xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-muted-foreground hover:bg-accent rounded-xl transition-colors">
              Cancelar
            </button>
            <button
              type="button"
              disabled={!razon.trim()}
              onClick={() => onConfirm(razon.trim())}
              className="px-4 py-2 text-sm font-semibold bg-ocean-500 hover:bg-ocean-600 text-white rounded-xl transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Confirmar
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

// ── Edit task modal ──────────────────────────────────────────────────────────
function EditTaskModal({
  task, estados, prioridades, users, projectId, onClose, onSaved,
}: {
  task: Task
  estados: Estado[]
  prioridades: Prioridad[]
  users: UserModel[]
  projectId: string
  onClose: () => void
  onSaved: () => void
}) {
  const qc = useQueryClient()
  const [loading, setLoading] = useState(false)
  const [razonConfig, setRazonConfig] = useState<{ title: string; description?: string } | null>(null)

  const [form, setForm] = useState({
    name:         task.name,
    descripcion:  task.descripcion ?? '',
    fecha_inicio: task.fecha_inicio ?? '',
    fecha_entrega:task.fecha_entrega ?? '',
    estado_ID:    task.estado_ID?.estado_ID ?? '',
    prioridad_ID: task.prioridad_ID?.prioridad_ID ?? '',
    asignado_a:   task.asignado_a?.user_ID ?? '',
  })

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const cls = 'w-full px-3 py-2 text-sm bg-background border border-input rounded-xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring'

  const doSave = async (razon = '') => {
    setLoading(true)
    try {
      await patchTask(task.tareas_ID, {
        name:         form.name,
        descripcion:  form.descripcion,
        fecha_inicio: form.fecha_inicio || undefined,
        fecha_entrega:form.fecha_entrega || undefined,
        estado_ID:    form.estado_ID || undefined,
        prioridad_ID: form.prioridad_ID || undefined,
        asignado_a:   form.asignado_a || null,
        razon,
      })
      await qc.invalidateQueries({ queryKey: ['tasks', projectId] })
      await qc.invalidateQueries({ queryKey: ['historial', projectId] })
      toast.success('Tarea actualizada')
      onSaved()
      onClose()
    } catch {
      toast.error('Error al actualizar tarea')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('El nombre es requerido'); return }
    if (form.fecha_inicio && form.fecha_entrega && form.fecha_entrega < form.fecha_inicio) {
      toast.error('La fecha de entrega no puede ser anterior a la de inicio'); return
    }
    const canceladoNombre = estados.find(e => e.estado_ID === form.estado_ID)?.name ?? ''
    const estadoCambio = form.estado_ID !== (task.estado_ID?.estado_ID ?? '')
    const fechaCambio  = form.fecha_entrega !== (task.fecha_entrega ?? '')
    const esCancelacion = estadoCambio && canceladoNombre.toLowerCase().includes('cancelad')
    const esAmpliacion  = fechaCambio && form.fecha_entrega > (task.fecha_entrega ?? '')

    if (esCancelacion || esAmpliacion) {
      const title = esCancelacion ? 'Motivo de cancelación' : 'Motivo de ampliación de plazo'
      const description = esCancelacion
        ? 'Esta tarea se marcará como cancelada. Indica el motivo.'
        : `La fecha de entrega se extiende de ${formatDate(task.fecha_entrega)} a ${formatDate(form.fecha_entrega)}.`
      setRazonConfig({ title, description })
    } else {
      doSave()
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
            <h2 className="text-base font-bold text-foreground">Editar tarea</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground transition-colors">
              <X size={15} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Nombre *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} className={cls} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Descripción</label>
              <textarea value={form.descripcion} onChange={e => set('descripcion', e.target.value)} rows={3}
                className={cn(cls, 'resize-none')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Fecha inicio</label>
                <input type="date" value={form.fecha_inicio} onChange={e => set('fecha_inicio', e.target.value)} className={cls} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Fecha entrega</label>
                <input type="date" value={form.fecha_entrega} min={form.fecha_inicio || undefined} onChange={e => set('fecha_entrega', e.target.value)} className={cls} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Estado</label>
                <select value={form.estado_ID} onChange={e => set('estado_ID', e.target.value)} className={cls}>
                  {estados.map(e => <option key={e.estado_ID} value={e.estado_ID}>{e.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Prioridad</label>
                <select value={form.prioridad_ID} onChange={e => set('prioridad_ID', e.target.value)} className={cls}>
                  {prioridades.map(p => <option key={p.prioridad_ID} value={p.prioridad_ID}>{p.name}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Asignado a</label>
              <select value={form.asignado_a} onChange={e => set('asignado_a', e.target.value)} className={cls}>
                <option value="">Sin asignar</option>
                {users.map(u => <option key={u.user_ID} value={u.user_ID}>{u.first_name} {u.last_name}</option>)}
              </select>
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
      <AnimatePresence>
        {razonConfig && (
          <RazonModal
            title={razonConfig.title}
            description={razonConfig.description}
            onClose={() => setRazonConfig(null)}
            onConfirm={razon => {
              setRazonConfig(null)
              doSave(razon)
            }}
          />
        )}
      </AnimatePresence>
    </>
  )
}

// ── Task modal ───────────────────────────────────────────────────────────────
function TaskModal({
  projectId, estados, prioridades, users, onClose, onCreated,
}: {
  projectId: string
  estados: Estado[]
  prioridades: Prioridad[]
  users: UserModel[]
  onClose: () => void
  onCreated: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    descripcion: '',
    fecha_inicio: '',
    fecha_entrega: '',
    prioridad_ID: prioridades[0]?.prioridad_ID ?? '',
    estado_ID: estados[0]?.estado_ID ?? '',
    asignado_a: '',
  })

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('El nombre es requerido'); return }
    if (form.fecha_inicio && form.fecha_entrega && form.fecha_entrega < form.fecha_inicio) {
      toast.error('La fecha de entrega no puede ser anterior a la de inicio'); return
    }
    setLoading(true)
    try {
      await createTask({ ...form, proyecto_ID: projectId, asignado_a: form.asignado_a || null })
      toast.success('Tarea creada')
      onCreated()
      onClose()
    } catch {
      toast.error('Error al crear tarea')
    } finally {
      setLoading(false)
    }
  }

  const cls = 'w-full px-3 py-2 text-sm bg-background border border-input rounded-xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-bold text-foreground">Nueva tarea</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground transition-colors">
            <X size={15} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Nombre *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Nombre de la tarea" className={cls} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Descripción</label>
            <textarea value={form.descripcion} onChange={e => set('descripcion', e.target.value)} rows={3} placeholder="Descripción..." className={cn(cls, 'resize-none')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Fecha inicio</label>
              <input type="date" value={form.fecha_inicio} onChange={e => set('fecha_inicio', e.target.value)} className={cls} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Fecha entrega</label>
              <input type="date" value={form.fecha_entrega} min={form.fecha_inicio || undefined} onChange={e => set('fecha_entrega', e.target.value)} className={cls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Prioridad</label>
              <select value={form.prioridad_ID} onChange={e => set('prioridad_ID', e.target.value)} className={cls}>
                {prioridades.map(p => <option key={p.prioridad_ID} value={p.prioridad_ID}>{p.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Estado</label>
              <select value={form.estado_ID} onChange={e => set('estado_ID', e.target.value)} className={cls}>
                {estados.map(e => <option key={e.estado_ID} value={e.estado_ID}>{e.name}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Asignado a</label>
            <select value={form.asignado_a} onChange={e => set('asignado_a', e.target.value)} className={cls}>
              <option value="">Sin asignar</option>
              {users.map(u => <option key={u.user_ID} value={u.user_ID}>{u.first_name} {u.last_name}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-muted-foreground hover:bg-accent rounded-xl transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="px-4 py-2 text-sm font-semibold bg-ocean-500 hover:bg-ocean-600 text-white rounded-xl transition-all active:scale-[0.98] disabled:opacity-60">
              {loading ? 'Creando...' : 'Crear tarea'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

// ── Task photos modal ────────────────────────────────────────────────────────
function TaskPhotosModal({ task, projectId, onClose }: { task: Task; projectId: string; onClose: () => void }) {
  const qc = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [taskUploadProgress, setTaskUploadProgress] = useState<{ current: number; total: number } | null>(null)
  const [dragOver, setDragOver]                     = useState(false)

  const uploadFiles = async (files: File[]) => {
    if (!files.length) return
    let done = 0
    let failed = 0
    setTaskUploadProgress({ current: 0, total: files.length })
    for (const file of files) {
      try {
        await uploadTaskImage(task.tareas_ID, file)
        done++
        setTaskUploadProgress({ current: done, total: files.length })
        qc.invalidateQueries({ queryKey: ['tasks', projectId] })
      } catch {
        failed++
      }
    }
    setTaskUploadProgress(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (failed === 0) {
      toast.success(files.length > 1 ? `${files.length} imágenes subidas` : 'Imagen subida')
    } else if (done > 0) {
      toast.warning(`${done} de ${files.length} imágenes subidas`)
    } else {
      toast.error('Error al subir las imágenes')
    }
  }

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (fileInputRef.current) fileInputRef.current.value = ''
    uploadFiles(files)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    uploadFiles(Array.from(e.dataTransfer.files))
  }

  const handleDelete = async (imageId: string) => {
    if (!window.confirm('¿Eliminar esta imagen?')) return
    try {
      await deleteTaskImage(imageId)
      await qc.invalidateQueries({ queryKey: ['tasks', projectId] })
      toast.success('Imagen eliminada')
    } catch {
      toast.error('Error al eliminar imagen')
    }
  }

  const images: TaskImage[] = task.images ?? []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card border border-border rounded-2xl w-full max-w-2xl shadow-2xl max-h-[85vh] flex flex-col"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-foreground">Fotos de tarea</h2>
            <p className="text-xs text-muted-foreground truncate">{task.name}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={taskUploadProgress !== null}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-ocean-500 hover:bg-ocean-600 text-white text-xs font-semibold rounded-xl transition-all active:scale-[0.98] disabled:opacity-60"
            >
              <Upload size={12} />
              {taskUploadProgress
                ? `${taskUploadProgress.current}/${taskUploadProgress.total}...`
                : 'Subir fotos'}
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground transition-colors">
              <X size={15} />
            </button>
          </div>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*,image/heic,image/heif" multiple className="hidden" onChange={handleUpload} />

        <div
          className="flex-1 overflow-y-auto p-6"
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false) }}
          onDrop={handleDrop}
        >
          {images.length === 0 ? (
            <div className={cn(
              'flex flex-col items-center justify-center py-16 gap-3 text-center border-2 border-dashed rounded-2xl transition-colors',
              dragOver ? 'border-ocean-500 bg-ocean-500/5' : 'border-border',
            )}>
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
                <ImageIcon size={20} className="text-muted-foreground/40" />
              </div>
              <p className="text-sm font-medium text-foreground">Sin imágenes</p>
              <p className="text-xs text-muted-foreground">Arrastra fotos aquí o usa el botón</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={!!taskUploadProgress}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-ocean-500 text-white text-xs font-semibold rounded-xl hover:bg-ocean-600 transition-all active:scale-[0.98] disabled:opacity-60"
              >
                <Upload size={12} /> Subir primera foto
              </button>
            </div>
          ) : (
            <div className={cn('rounded-xl transition-colors p-1 -m-1', dragOver && 'ring-2 ring-ocean-500 bg-ocean-500/5')}>
              <ImageGrid images={images} onDelete={handleDelete} />
              {taskUploadProgress && (
                <div className="mt-3 space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Subiendo {taskUploadProgress.current}/{taskUploadProgress.total}</span>
                    <span>{Math.round((taskUploadProgress.current / taskUploadProgress.total) * 100)}%</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-ocean-500 rounded-full transition-all duration-300"
                      style={{ width: `${(taskUploadProgress.current / taskUploadProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}
              {dragOver && !taskUploadProgress && (
                <p className="text-center text-xs text-ocean-500 font-medium mt-3">Suelta para subir</p>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

// ── Task card ────────────────────────────────────────────────────────────────
function TaskCard({
  task, estados, projectId, onEdit,
}: {
  task: Task
  estados: Estado[]
  projectId: string
  onEdit: (task: Task) => void
}) {
  const qc = useQueryClient()
  const [updating, setUpdating]   = useState(false)
  const [showPhotos, setShowPhotos] = useState(false)
  const imageCount = task.images?.length ?? 0

  const handleStatusChange = async (estadoId: string) => {
    setUpdating(true)
    try {
      await updateTask(task.tareas_ID, { estado_ID: estadoId })
      await qc.invalidateQueries({ queryKey: ['tasks', projectId] })
      toast.success('Estado actualizado')
    } catch {
      toast.error('Error al actualizar estado')
    } finally {
      setUpdating(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm(`¿Eliminar la tarea "${task.name}"?`)) return
    try {
      await deleteTask(task.tareas_ID)
      await qc.invalidateQueries({ queryKey: ['tasks', projectId] })
      toast.success('Tarea eliminada')
    } catch {
      toast.error('Error al eliminar tarea')
    }
  }

  return (
    <>
      <div
        draggable
        onDragStart={e => {
          e.dataTransfer.setData('taskId', task.tareas_ID)
          e.dataTransfer.effectAllowed = 'move'
        }}
        className="flex items-start gap-3 px-4 py-3 bg-card border border-border rounded-xl group cursor-grab active:cursor-grabbing active:opacity-60 active:scale-[0.98] transition-all"
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground leading-snug">{task.name}</p>
          {task.descripcion && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{task.descripcion}</p>
          )}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {task.fecha_inicio && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Calendar size={9} /> {formatDate(task.fecha_inicio)}
              </span>
            )}
            {task.fecha_entrega && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Clock size={9} /> {formatDate(task.fecha_entrega)}
              </span>
            )}
            {task.prioridad_ID?.name && (
              <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full', PRIORITY_STYLE[task.prioridad_ID.name] ?? 'bg-muted text-muted-foreground')}>
                {task.prioridad_ID.name}
              </span>
            )}
            {task.asignado_a && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground" title={`${task.asignado_a.first_name} ${task.asignado_a.last_name}`}>
                {task.asignado_a.user_photo ? (
                  <img src={task.asignado_a.user_photo} alt="" className="w-3.5 h-3.5 rounded-full object-cover" />
                ) : (
                  <div className="w-3.5 h-3.5 rounded-full bg-amber-400 flex items-center justify-center text-[8px] font-bold text-white">
                    {task.asignado_a.first_name?.[0]}
                  </div>
                )}
                {task.asignado_a.first_name}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => setShowPhotos(true)}
            title="Fotos de la tarea"
            className={cn(
              'flex items-center gap-1 p-1 rounded-lg transition-colors',
              imageCount > 0
                ? 'text-ocean-500 hover:bg-ocean-50 dark:hover:bg-ocean-500/10'
                : 'text-muted-foreground hover:bg-accent opacity-0 group-hover:opacity-100',
            )}
          >
            <ImageIcon size={12} />
            {imageCount > 0 && <span className="text-[10px] font-bold">{imageCount}</span>}
          </button>
          <select
            value={task.estado_ID?.estado_ID ?? ''}
            onChange={e => handleStatusChange(e.target.value)}
            disabled={updating}
            className="text-[11px] bg-background border border-input rounded-lg px-1.5 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-60 cursor-pointer"
          >
            {estados.map(e => <option key={e.estado_ID} value={e.estado_ID}>{e.name}</option>)}
          </select>
          <button
            onClick={() => onEdit(task)}
            className="p-1 rounded-lg text-muted-foreground hover:text-ocean-500 hover:bg-ocean-50 dark:hover:bg-ocean-500/10 transition-colors opacity-0 group-hover:opacity-100"
          >
            <Edit2 size={12} />
          </button>
          <button
            onClick={handleDelete}
            className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
      <AnimatePresence>
        {showPhotos && (
          <TaskPhotosModal task={task} projectId={projectId} onClose={() => setShowPhotos(false)} />
        )}
      </AnimatePresence>
    </>
  )
}

// ── Task group (with drag-and-drop target) ───────────────────────────────────
function TaskGroup({
  status, tasks, estados, projectId, onEditTask,
}: {
  status: string
  tasks: Task[]
  estados: Estado[]
  projectId: string
  onEditTask: (task: Task) => void
}) {
  const qc = useQueryClient()
  const [open, setOpen]       = useState(status === 'En progreso' || status === 'Pendiente')
  const [dragOver, setDragOver] = useState(false)

  if (tasks.length === 0) return null

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragOver(true) }
  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false)
  }
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const taskId = e.dataTransfer.getData('taskId')
    const estado = estados.find(es => es.name === status)
    if (!taskId || !estado) return
    try {
      await updateTask(taskId, { estado_ID: estado.estado_ID })
      await qc.invalidateQueries({ queryKey: ['tasks', projectId] })
    } catch {
      toast.error('Error al mover tarea')
    }
  }

  return (
    <div
      className={cn(
        'space-y-2 rounded-xl p-2 -m-2 transition-all duration-150',
        dragOver && 'bg-ocean-500/5 ring-2 ring-ocean-500/30',
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 w-full text-left group"
      >
        {open
          ? <ChevronDown size={13} className="text-muted-foreground" />
          : <ChevronRight size={13} className="text-muted-foreground" />
        }
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{status}</span>
        <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full', STATUS_STYLE[status] ?? 'bg-muted text-muted-foreground')}>
          {tasks.length}
        </span>
        {dragOver && <span className="text-[10px] text-ocean-500 font-medium ml-1">Soltar aquí</span>}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2 overflow-hidden"
          >
            {tasks.map(t => (
              <TaskCard key={t.tareas_ID} task={t} estados={estados} projectId={projectId} onEdit={onEditTask} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Drop zone component ──────────────────────────────────────────────────────
function DropZone({ onFiles, disabled, progress }: {
  onFiles: (files: File[]) => void
  disabled?: boolean
  progress?: { current: number; total: number } | null
}) {
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const pick = (raw: FileList | null) => {
    if (!raw) return
    const files = Array.from(raw)
    if (fileRef.current) fileRef.current.value = '' // reset para permitir reselección
    if (files.length) onFiles(files)
  }

  return (
    <div
      className={cn(
        'border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer',
        dragOver ? 'border-ocean-500 bg-ocean-500/5' : 'border-border hover:border-ocean-500/50',
        disabled && 'opacity-50 cursor-not-allowed',
      )}
      onDragOver={e => { e.preventDefault(); if (!disabled) setDragOver(true) }}
      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false) }}
      onDrop={e => { e.preventDefault(); setDragOver(false); if (!disabled) pick(e.dataTransfer.files) }}
      onClick={() => !disabled && fileRef.current?.click()}
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/*,image/heic,image/heif"
        multiple
        className="hidden"
        onChange={e => pick(e.target.files)}
      />
      <div className="flex flex-col items-center gap-2">
        <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
          <Upload size={20} className={cn('transition-colors', dragOver ? 'text-ocean-500' : 'text-muted-foreground/40')} />
        </div>
        {progress ? (
          <>
            <p className="text-sm font-medium text-ocean-500">
              Subiendo {progress.current} de {progress.total}...
            </p>
            <div className="w-32 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-ocean-500 rounded-full transition-all duration-300"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-foreground">
              {dragOver ? 'Suelta las imágenes' : 'Arrastra fotos aquí'}
            </p>
            <p className="text-xs text-muted-foreground">o haz clic · puedes seleccionar varias a la vez</p>
          </>
        )}
      </div>
    </div>
  )
}

// ── Tabs ─────────────────────────────────────────────────────────────────────
const TABS = ['Tareas', 'Información', 'Fotos', 'Comentarios', 'Actividad'] as const
type Tab = typeof TABS[number]

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { user } = useAppStore()
  const canDelegate = !!user?.role && ROLES_DELEGADORES.has(user.role)

  const [tab, setTab]                         = useState<Tab>('Tareas')
  const [showTaskModal, setShowTaskModal]       = useState(false)
  const [showEditModal, setShowEditModal]       = useState(false)
  const [editingTask, setEditingTask]           = useState<Task | null>(null)
  const [newComment, setNewComment]             = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null)

  const { data: project, isLoading: loadingProject } = useQuery<Project>({
    queryKey: ['project', id],
    queryFn: () => getProjectById(id!),
    enabled: !!id,
  })

  const { data: tasks = [], isLoading: loadingTasks } = useQuery<Task[]>({
    queryKey: ['tasks', id],
    queryFn: () => getTasksByProject(id!),
    enabled: !!id,
  })

  const { data: feedback = [], isLoading: loadingFeedback } = useQuery<Feedback[]>({
    queryKey: ['feedback', id],
    queryFn: () => getFeedback(id!),
    enabled: !!id,
  })

  const { data: historial = [] } = useQuery<HistorialEntry[]>({
    queryKey: ['historial', id],
    queryFn: () => getHistorial(id!),
    enabled: !!id,
  })

  const { data: estados = [] }     = useQuery<Estado[]>({ queryKey: ['estados'], queryFn: getEstados })
  const { data: prioridades = [] } = useQuery<Prioridad[]>({ queryKey: ['prioridades'], queryFn: getPrioridades })
  const { data: users = [] }       = useQuery<UserModel[]>({ queryKey: ['users'], queryFn: getUsers })

  const [taskSearch, setTaskSearch] = useState('')

  const handleDeleteProject = async () => {
    if (!project) return
    if (!window.confirm(`¿Eliminar el proyecto "${project.name}"? Esta acción no se puede deshacer.`)) return
    try {
      await deleteProject(id!)
      toast.success('Proyecto eliminado')
      navigate('/dashboard')
    } catch {
      toast.error('Error al eliminar proyecto')
    }
  }

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return
    setSubmittingComment(true)
    try {
      await createFeedback({ proyecto_ID: id, info: newComment.trim(), user_ID: user?.user_ID })
      setNewComment('')
      await qc.invalidateQueries({ queryKey: ['feedback', id] })
      toast.success('Comentario agregado')
    } catch {
      toast.error('Error al agregar comentario')
    } finally {
      setSubmittingComment(false)
    }
  }

  const uploadProjectFiles = async (files: File[]) => {
    if (!files.length) return
    let done = 0
    let failed = 0
    setUploadProgress({ current: 0, total: files.length })
    for (const file of files) {
      try {
        await uploadProjectImage(id!, file)
        done++
        setUploadProgress({ current: done, total: files.length })
        qc.invalidateQueries({ queryKey: ['project', id] })
      } catch {
        failed++
      }
    }
    setUploadProgress(null)
    if (failed === 0) {
      toast.success(files.length > 1 ? `${files.length} imágenes subidas` : 'Imagen subida')
    } else if (done > 0) {
      toast.warning(`${done} de ${files.length} imágenes subidas`)
    } else {
      toast.error('Error al subir las imágenes')
    }
  }

  const handleDeleteImage = async (imageId: string) => {
    if (!window.confirm('¿Eliminar esta imagen?')) return
    try {
      await deleteProjectImage(imageId)
      await qc.invalidateQueries({ queryKey: ['project', id] })
      toast.success('Imagen eliminada')
    } catch {
      toast.error('Error al eliminar imagen')
    }
  }

  const handleDeleteComment = async (feedId: string) => {
    if (!window.confirm('¿Eliminar este comentario?')) return
    try {
      await deleteFeedback(feedId)
      await qc.invalidateQueries({ queryKey: ['feedback', id] })
      toast.success('Comentario eliminado')
    } catch {
      toast.error('Error al eliminar comentario')
    }
  }

  if (loadingProject) {
    return (
      <div className="flex flex-col h-full animate-pulse">
        <div className="h-[72px] bg-card border-b border-border" />
        <div className="p-6 space-y-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-12 bg-muted rounded-xl" />)}
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
        <AlertCircle size={32} />
        <p className="text-sm">Proyecto no encontrado</p>
        <button onClick={() => navigate(-1)} className="text-xs text-ocean-500 hover:underline">Volver</button>
      </div>
    )
  }

  const overdue = isOverdue(project)
  const days = project.fecha_entrega ? daysUntil(project.fecha_entrega) : null
  const totalTasks     = tasks.length
  const completedTasks = tasks.filter(t => t.estado_ID?.name === 'Completado').length
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  const filteredTasks = taskSearch.trim()
    ? tasks.filter(t => t.name.toLowerCase().includes(taskSearch.toLowerCase()) || t.descripcion?.toLowerCase().includes(taskSearch.toLowerCase()))
    : tasks

  const grouped: Record<string, Task[]> = { 'En progreso': [], 'Pendiente': [], 'Completado': [], 'Cancelado': [] }
  filteredTasks.forEach(t => {
    const s = t.estado_ID?.name ?? 'Pendiente'
    if (grouped[s]) grouped[s].push(t)
    else grouped['Pendiente'].push(t)
  })

  const projectImages = project.images ?? []

  return (
    <div className="flex flex-col h-full">

      {/* ── Header ── */}
      <div className="bg-card border-b border-border px-6 flex-shrink-0" style={{ minHeight: 72 }}>
        <div className="flex items-start gap-3 py-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground transition-colors flex-shrink-0 mt-0.5 active:scale-[0.98]"
          >
            <ArrowLeft size={16} />
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-foreground leading-tight">{project.name}</h1>
              {project.estado_ID?.name && (
                <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 mt-1', STATUS_STYLE[project.estado_ID.name] ?? 'bg-muted text-muted-foreground')}>
                  {project.estado_ID.name}
                </span>
              )}
              {project.prioridad_ID?.name && (
                <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 mt-1', PRIORITY_STYLE[project.prioridad_ID.name] ?? 'bg-muted text-muted-foreground')}>
                  {project.prioridad_ID.name}
                </span>
              )}
              {days !== null && project.estado_ID?.name !== 'Completado' && project.estado_ID?.name !== 'Cancelado' && (
                <span className={cn(
                  'text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 mt-1',
                  overdue ? 'bg-red-50 text-red-500 dark:bg-red-500/10 dark:text-red-400' :
                  days <= 3 ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' :
                  'bg-muted text-muted-foreground',
                )}>
                  {overdue ? `Vencido ${Math.abs(days)}d` : days === 0 ? 'Vence hoy' : `${days}d restantes`}
                </span>
              )}
            </div>

            {totalTasks > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <div className="flex-1 max-w-48 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-ocean-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>
                <span className="text-[10px] text-muted-foreground">{completedTasks}/{totalTasks} tareas · {progress}%</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={() => setShowTaskModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-ocean-500 hover:bg-ocean-600 text-white text-xs font-semibold rounded-xl transition-all active:scale-[0.98]"
            >
              <Plus size={12} /> Nueva tarea
            </button>
            <button
              onClick={() => setShowEditModal(true)}
              className="p-1.5 rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground transition-colors active:scale-[0.98]"
              title="Editar proyecto"
            >
              <Edit2 size={14} />
            </button>
            <button
              onClick={handleDeleteProject}
              className="p-1.5 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors active:scale-[0.98]"
              title="Eliminar proyecto"
            >
              <Trash2 size={14} />
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
                tab === t
                  ? 'border-ocean-500 text-ocean-500'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {t}
              {t === 'Comentarios' && feedback.length > 0 && (
                <span className="ml-1.5 text-[9px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">{feedback.length}</span>
              )}
              {t === 'Tareas' && totalTasks > 0 && (
                <span className="ml-1.5 text-[9px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">{totalTasks}</span>
              )}
              {t === 'Fotos' && projectImages.length > 0 && (
                <span className="ml-1.5 text-[9px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">{projectImages.length}</span>
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

            {/* ── Tareas ── */}
            {tab === 'Tareas' && (
              <div className="space-y-5 max-w-3xl">
                {tasks.length > 0 && (
                  <div className="relative">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <input
                      value={taskSearch}
                      onChange={e => setTaskSearch(e.target.value)}
                      placeholder="Buscar tareas..."
                      className="w-full pl-9 pr-8 py-2 text-sm bg-background border border-input rounded-xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                    />
                    {taskSearch && (
                      <button onClick={() => setTaskSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        <X size={12} />
                      </button>
                    )}
                  </div>
                )}
                {loadingTasks ? (
                  [...Array(4)].map((_, i) => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)
                ) : tasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
                      <CheckCircle2 size={20} className="text-muted-foreground/40" />
                    </div>
                    <p className="text-sm font-medium text-foreground">Sin tareas</p>
                    <p className="text-xs text-muted-foreground">Crea la primera tarea para este proyecto</p>
                    <button
                      onClick={() => setShowTaskModal(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-ocean-500 text-white text-xs font-semibold rounded-xl hover:bg-ocean-600 transition-all active:scale-[0.98]"
                    >
                      <Plus size={12} /> Nueva tarea
                    </button>
                  </div>
                ) : filteredTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
                    <p className="text-sm font-medium text-foreground">Sin resultados</p>
                    <p className="text-xs text-muted-foreground">Ninguna tarea coincide con "{taskSearch}"</p>
                    <button onClick={() => setTaskSearch('')} className="text-xs text-ocean-500 hover:underline">Limpiar búsqueda</button>
                  </div>
                ) : (
                  <>
                    <p className="text-[10px] text-muted-foreground">
                      {taskSearch ? `${filteredTasks.length} de ${tasks.length} tareas` : 'Arrastra las tarjetas entre grupos para cambiar el estado'}
                    </p>
                    {TASK_GROUP_ORDER.map(status => (
                      <TaskGroup
                        key={status}
                        status={status}
                        tasks={grouped[status] ?? []}
                        estados={estados}
                        projectId={id!}
                        onEditTask={setEditingTask}
                      />
                    ))}
                  </>
                )}
              </div>
            )}

            {/* ── Información ── */}
            {tab === 'Información' && (
              <div className="max-w-2xl">
                <div className="bg-card border border-border rounded-2xl p-6">
                  <h3 className="text-sm font-bold text-foreground mb-4">Detalles del proyecto</h3>
                  {project.descripcion && (
                    <p className="text-sm text-muted-foreground mb-5 leading-relaxed">{project.descripcion}</p>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InfoRow label="Departamento">
                      <span className="flex items-center gap-1.5">
                        <Building2 size={12} className="text-muted-foreground flex-shrink-0" />
                        {project.departamento_ID?.name ?? '—'}
                      </span>
                    </InfoRow>
                    <InfoRow label="Responsable">
                      <span className="flex items-center gap-1.5">
                        <UserIcon size={12} className="text-muted-foreground flex-shrink-0" />
                        {project.user_ID ? fullName(project.user_ID) : '—'}
                      </span>
                    </InfoRow>
                    <InfoRow label="Fecha inicio">
                      <span className="flex items-center gap-1.5">
                        <Calendar size={12} className="text-muted-foreground flex-shrink-0" />
                        {formatDate(project.fecha_inicio)}
                      </span>
                    </InfoRow>
                    <InfoRow label="Fecha entrega">
                      <span className={cn('flex items-center gap-1.5', overdue ? 'text-red-500' : '')}>
                        <Clock size={12} className="flex-shrink-0" />
                        {formatDate(project.fecha_entrega)}
                      </span>
                    </InfoRow>
                    {project.costo != null && (
                      <InfoRow label="Costo base">
                        <span className="flex items-center gap-1.5">
                          <DollarSign size={12} className="text-muted-foreground flex-shrink-0" />
                          ₡{project.costo.toLocaleString('es-CR')}
                        </span>
                      </InfoRow>
                    )}
                  </div>
                </div>

                <div className="mt-4 space-y-4">
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Estado</h3>
                    <StatusStepper
                      estados={estados}
                      currentId={project.estado_ID?.estado_ID ?? ''}
                      onChange={async (nuevoId, motivo) => {
                        await patchProject(project.proyect_ID, { estado_ID: nuevoId, razon: motivo ?? '' })
                        await qc.invalidateQueries({ queryKey: ['project', id] })
                        await qc.invalidateQueries({ queryKey: ['projects'] })
                        toast.success('Estado actualizado')
                      }}
                    />
                  </div>

                  <BudgetSection
                    proyectoId={project.proyect_ID}
                    costoBase={project.costo ?? 0}
                  />

                  <DelegacionPanel
                    proyectoId={project.proyect_ID}
                    canManage={canDelegate}
                  />
                </div>
              </div>
            )}

            {/* ── Fotos ── */}
            {tab === 'Fotos' && (
              <div className="max-w-4xl space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {projectImages.length === 0
                      ? 'Sin imágenes aún'
                      : `${projectImages.length} imagen${projectImages.length !== 1 ? 'es' : ''} · haz clic para ampliar`}
                  </p>
                  {projectImages.length > 0 && (
                    <span className="text-[10px] text-muted-foreground">
                      {uploadProgress
                        ? `Subiendo ${uploadProgress.current}/${uploadProgress.total}...`
                        : 'Arrastra o selecciona varias fotos en la zona de abajo'}
                    </span>
                  )}
                </div>

                {projectImages.length > 0 && (
                  <ImageGrid images={projectImages} onDelete={handleDeleteImage} />
                )}

                <DropZone onFiles={uploadProjectFiles} disabled={uploadProgress !== null} progress={uploadProgress} />
              </div>
            )}

            {/* ── Comentarios ── */}
            {tab === 'Comentarios' && (
              <div className="max-w-2xl space-y-4">
                <form onSubmit={handleAddComment} className="flex gap-2">
                  <input
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    placeholder="Agregar comentario..."
                    className="flex-1 px-3 py-2 text-sm bg-background border border-input rounded-xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button
                    type="submit"
                    disabled={submittingComment || !newComment.trim()}
                    className="px-4 py-2 text-sm font-semibold bg-ocean-500 hover:bg-ocean-600 text-white rounded-xl transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    Enviar
                  </button>
                </form>

                {loadingFeedback ? (
                  [...Array(3)].map((_, i) => <div key={i} className="h-14 bg-muted rounded-xl animate-pulse" />)
                ) : feedback.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
                      <MessageSquare size={20} className="text-muted-foreground/40" />
                    </div>
                    <p className="text-sm text-muted-foreground">Sin comentarios aún</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {feedback.map((f: Feedback) => {
                      const author = f.user_ID
                      const initials = author
                        ? `${author.first_name?.[0] ?? ''}${author.last_name?.[0] ?? ''}`.toUpperCase()
                        : (user?.first_name?.[0]?.toUpperCase() ?? 'U')
                      return (
                        <div key={f.feed_ID} className="flex items-start gap-3 bg-card border border-border rounded-xl px-4 py-3 group">
                          {author?.user_photo ? (
                            <img src={author.user_photo} alt="" className="w-7 h-7 rounded-lg object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-7 h-7 rounded-lg bg-ocean-500/10 text-ocean-500 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                              {initials}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-[11px] font-semibold text-foreground">
                                {author ? `${author.first_name} ${author.last_name}` : (user ? `${user.first_name} ${user.last_name}` : 'Usuario')}
                              </span>
                              {f.created_at && (
                                <span className="text-[10px] text-muted-foreground">
                                  {new Date(f.created_at).toLocaleDateString('es-CR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-foreground leading-snug">{f.info}</p>
                          </div>
                          <button
                            onClick={() => handleDeleteComment(f.feed_ID)}
                            className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── Actividad ── */}
            {tab === 'Actividad' && (
              <div className="max-w-2xl space-y-5">

                {/* Resumen */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Total tareas',  value: totalTasks,                           color: 'text-foreground' },
                    { label: 'Completadas',   value: grouped['Completado']?.length ?? 0,   color: 'text-emerald-500' },
                    { label: 'En progreso',   value: grouped['En progreso']?.length ?? 0,  color: 'text-blue-500' },
                    { label: 'Pendientes',    value: grouped['Pendiente']?.length ?? 0,    color: 'text-muted-foreground' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="bg-card border border-border rounded-xl px-4 py-3">
                      <p className={cn('text-2xl font-bold', color)}>{value}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>

                {/* Barra de progreso */}
                {totalTasks > 0 && (
                  <div className="bg-card border border-border rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-foreground">Progreso general</p>
                      <p className="text-xs font-bold text-ocean-500">{progress}%</p>
                    </div>
                    <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-ocean-500 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                      />
                    </div>
                    <div className="flex gap-3 flex-wrap">
                      {TASK_GROUP_ORDER.map(s => (
                        (grouped[s]?.length ?? 0) > 0 && (
                          <div key={s} className="flex items-center gap-1.5">
                            <div className={cn('w-2 h-2 rounded-full', STATUS_DOT[s])} />
                            <span className="text-[10px] text-muted-foreground">{s}: {grouped[s].length}</span>
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                )}

                {/* Historial de cambios */}
                <div className="space-y-2">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Activity size={11} /> Historial de cambios {historial.length > 0 && `(${historial.length})`}
                  </p>
                  {historial.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3 text-center bg-card border border-border rounded-xl">
                      <Activity size={28} className="text-muted-foreground/30" />
                      <p className="text-sm text-muted-foreground">Sin cambios registrados aún</p>
                      <p className="text-[11px] text-muted-foreground/60">Los cambios a tareas y al proyecto aparecerán aquí</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {historial.map(entry => {
                        const relTime = (() => {
                          const diff = Date.now() - new Date(entry.created_at).getTime()
                          const mins = Math.floor(diff / 60000)
                          if (mins < 1) return 'ahora'
                          if (mins < 60) return `hace ${mins} min`
                          const hrs = Math.floor(mins / 60)
                          if (hrs < 24) return `hace ${hrs} h`
                          const days = Math.floor(hrs / 24)
                          if (days < 30) return `hace ${days} día${days > 1 ? 's' : ''}`
                          return formatDate(entry.created_at)
                        })()
                        const changes: string[] = []
                        if (entry.datos_anteriores && entry.datos_nuevos) {
                          const a = entry.datos_anteriores
                          const n = entry.datos_nuevos
                          if (a.name && n.name && a.name !== n.name) changes.push(`Nombre: "${a.name}" → "${n.name}"`)
                          if (a.fecha_entrega && n.fecha_entrega && a.fecha_entrega !== n.fecha_entrega) changes.push(`Entrega: ${formatDate(a.fecha_entrega)} → ${formatDate(n.fecha_entrega)}`)
                          if (a.costo && n.costo && a.costo !== n.costo) changes.push(`Costo: ₡${Number(a.costo).toLocaleString()} → ₡${Number(n.costo).toLocaleString()}`)
                        }
                        return (
                          <div key={entry.historial_ID} className="flex items-start gap-3 bg-card border border-border rounded-xl px-4 py-3">
                            <div className="w-7 h-7 rounded-lg bg-ocean-500/10 text-ocean-500 flex items-center justify-center flex-shrink-0">
                              <Activity size={13} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <span className="text-xs font-semibold text-foreground">{entry.tipo_display}</span>
                                  {entry.tarea_ID && (
                                    <span className="ml-1.5 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">tarea</span>
                                  )}
                                </div>
                                <span className="text-[10px] text-muted-foreground flex-shrink-0">{relTime}</span>
                              </div>
                              {entry.usuario && (
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                  Por {entry.usuario.first_name} {entry.usuario.last_name}
                                </p>
                              )}
                              {entry.razon && (
                                <p className="text-xs text-foreground/80 mt-1 italic">"{entry.razon}"</p>
                              )}
                              {changes.map((c, i) => (
                                <p key={i} className="text-[10px] text-muted-foreground mt-0.5">{c}</p>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Modales ── */}
      <AnimatePresence>
        {showTaskModal && estados.length > 0 && prioridades.length > 0 && (
          <TaskModal
            projectId={id!}
            estados={estados}
            prioridades={prioridades}
            users={users}
            onClose={() => setShowTaskModal(false)}
            onCreated={() => qc.invalidateQueries({ queryKey: ['tasks', id] })}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showEditModal && project && (
          <EditProjectModal
            project={project}
            estados={estados}
            prioridades={prioridades}
            onClose={() => setShowEditModal(false)}
            onSaved={() => qc.invalidateQueries({ queryKey: ['project', id] })}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingTask && estados.length > 0 && prioridades.length > 0 && (
          <EditTaskModal
            task={editingTask}
            estados={estados}
            prioridades={prioridades}
            users={users}
            projectId={id!}
            onClose={() => setEditingTask(null)}
            onSaved={() => setEditingTask(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
