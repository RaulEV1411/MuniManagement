import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Check, FolderOpen } from 'lucide-react'
import { toast } from 'sonner'
import {
  getTipos, getEstados, getPrioridades, getDepartments, getUsers, createProject,
} from '@/lib/api'
import { type Tipo, type Estado, type Prioridad, type Department, type User } from '@/types'
import { cn, formatDate, fullName } from '@/lib/utils'

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

interface FormData {
  name: string
  descripcion: string
  tipos_ID: string
  fecha_inicio: string
  fecha_entrega: string
  costo: string
  estado_ID: string
  prioridad_ID: string
  departamento_ID: string
  user_ID: string
}

const INITIAL: FormData = {
  name: '',
  descripcion: '',
  tipos_ID: '',
  fecha_inicio: '',
  fecha_entrega: '',
  costo: '',
  estado_ID: '',
  prioridad_ID: '',
  departamento_ID: '',
  user_ID: '',
}

const STEP_LABELS = ['Básico', 'Planificación', 'Asignación']

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 40 : -40, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -40 : 40, opacity: 0 }),
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-muted-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      {children}
    </div>
  )
}

const inputCls = 'w-full px-3 py-2 text-sm bg-background border border-input rounded-xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring transition-all'

function SummaryRow({ label, value, badge, badgeStyle }: {
  label: string; value: string; badge?: boolean; badgeStyle?: string
}) {
  return (
    <div className="flex items-start justify-between py-2 border-b border-border last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      {badge ? (
        <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', badgeStyle ?? 'bg-muted text-muted-foreground')}>
          {value}
        </span>
      ) : (
        <span className="text-xs font-medium text-foreground text-right max-w-[60%]">{value || '—'}</span>
      )}
    </div>
  )
}

export default function ProjectCreatePage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [dir, setDir] = useState(1)
  const [form, setForm] = useState<FormData>(INITIAL)
  const [loading, setLoading] = useState(false)

  const set = (k: keyof FormData, v: string) => setForm(f => ({ ...f, [k]: v }))

  const { data: tipos = [] }       = useQuery<Tipo[]>({ queryKey: ['tipos'], queryFn: getTipos })
  const { data: estados = [] }     = useQuery<Estado[]>({ queryKey: ['estados'], queryFn: getEstados })
  const { data: prioridades = [] } = useQuery<Prioridad[]>({ queryKey: ['prioridades'], queryFn: getPrioridades })
  const { data: departments = [] } = useQuery<Department[]>({ queryKey: ['departments'], queryFn: getDepartments })
  const { data: users = [] }       = useQuery<User[]>({ queryKey: ['users'], queryFn: getUsers })

  const goNext = () => {
    if (step === 0 && !form.name.trim()) { toast.error('El nombre es requerido'); return }
    setDir(1)
    setStep(s => s + 1)
  }

  const goPrev = () => {
    setDir(-1)
    setStep(s => s - 1)
  }

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast.error('El nombre es requerido'); return }
    if (!form.departamento_ID) { toast.error('Selecciona un departamento'); return }
    if (!form.user_ID) { toast.error('Selecciona un responsable'); return }

    setLoading(true)
    try {
      await createProject({
        name: form.name,
        descripcion: form.descripcion,
        tipos_ID: form.tipos_ID || undefined,
        fecha_inicio: form.fecha_inicio || undefined,
        fecha_entrega: form.fecha_entrega || undefined,
        costo: form.costo ? parseFloat(form.costo) : undefined,
        estado_ID: form.estado_ID || undefined,
        prioridad_ID: form.prioridad_ID || undefined,
        departamento_ID: form.departamento_ID,
        user_ID: form.user_ID,
      })
      toast.success('Proyecto creado exitosamente')
      navigate('/dashboard')
    } catch {
      toast.error('Error al crear el proyecto')
    } finally {
      setLoading(false)
    }
  }

  const selectedEstado    = estados.find(e => e.estado_ID === form.estado_ID)
  const selectedPrioridad = prioridades.find(p => p.prioridad_ID === form.prioridad_ID)
  const selectedDept      = departments.find(d => d.departamentos_ID === form.departamento_ID)
  const selectedUser      = users.find(u => u.user_ID === form.user_ID)

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ── */}
      <div className="bg-card border-b border-border px-6 flex items-center gap-3 flex-shrink-0" style={{ height: 72 }}>
        <div className="w-9 h-9 rounded-xl bg-ocean-500 flex items-center justify-center flex-shrink-0">
          <FolderOpen size={16} className="text-white" />
        </div>
        <div>
          <h1 className="text-base font-bold text-foreground">Nuevo proyecto</h1>
          <p className="text-xs text-muted-foreground">Paso {step + 1} de 3 — {STEP_LABELS[step]}</p>
        </div>
      </div>

      {/* ── Progress bar ── */}
      <div className="flex-shrink-0 bg-card border-b border-border px-6 py-4">
        <div className="flex items-center gap-2 max-w-lg">
          {STEP_LABELS.map((label, i) => (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 transition-all',
                i < step  ? 'bg-ocean-500 text-white' :
                i === step ? 'bg-ocean-500 text-white ring-4 ring-ocean-500/20' :
                             'bg-muted text-muted-foreground',
              )}>
                {i < step ? <Check size={11} /> : i + 1}
              </div>
              <span className={cn('text-xs font-medium hidden sm:block', i === step ? 'text-foreground' : 'text-muted-foreground')}>
                {label}
              </span>
              {i < STEP_LABELS.length - 1 && (
                <div className={cn('flex-1 h-0.5 rounded-full transition-all', i < step ? 'bg-ocean-500' : 'bg-border')} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Formulario ── */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-lg mx-auto">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={step}
              custom={dir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="space-y-4"
            >
              {/* Paso 1: Básico */}
              {step === 0 && (
                <>
                  <Field label="Nombre del proyecto" required>
                    <input
                      value={form.name}
                      onChange={e => set('name', e.target.value)}
                      placeholder="Ej: Mejoramiento vial sector norte"
                      className={inputCls}
                      autoFocus
                    />
                  </Field>
                  <Field label="Descripción">
                    <textarea
                      value={form.descripcion}
                      onChange={e => set('descripcion', e.target.value)}
                      rows={4}
                      placeholder="Describe el alcance y objetivos del proyecto..."
                      className={cn(inputCls, 'resize-none')}
                    />
                  </Field>
                  <Field label="Tipo de proyecto">
                    <select value={form.tipos_ID} onChange={e => set('tipos_ID', e.target.value)} className={inputCls}>
                      <option value="">Seleccionar tipo...</option>
                      {tipos.map(t => <option key={t.tipos_ID} value={t.tipos_ID}>{t.name}</option>)}
                    </select>
                  </Field>
                </>
              )}

              {/* Paso 2: Planificación */}
              {step === 1 && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Fecha inicio">
                      <input type="date" value={form.fecha_inicio} onChange={e => set('fecha_inicio', e.target.value)} className={inputCls} />
                    </Field>
                    <Field label="Fecha entrega">
                      <input type="date" value={form.fecha_entrega} onChange={e => set('fecha_entrega', e.target.value)} className={inputCls} />
                    </Field>
                  </div>
                  <Field label="Costo estimado (₡)">
                    <input
                      type="number"
                      value={form.costo}
                      onChange={e => set('costo', e.target.value)}
                      placeholder="0"
                      min="0"
                      className={inputCls}
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Estado">
                      <select value={form.estado_ID} onChange={e => set('estado_ID', e.target.value)} className={inputCls}>
                        <option value="">Seleccionar...</option>
                        {estados.map(e => <option key={e.estado_ID} value={e.estado_ID}>{e.name}</option>)}
                      </select>
                    </Field>
                    <Field label="Prioridad">
                      <select value={form.prioridad_ID} onChange={e => set('prioridad_ID', e.target.value)} className={inputCls}>
                        <option value="">Seleccionar...</option>
                        {prioridades.map(p => <option key={p.prioridad_ID} value={p.prioridad_ID}>{p.name}</option>)}
                      </select>
                    </Field>
                  </div>
                </>
              )}

              {/* Paso 3: Asignación + resumen */}
              {step === 2 && (
                <>
                  <Field label="Departamento" required>
                    <select value={form.departamento_ID} onChange={e => set('departamento_ID', e.target.value)} className={inputCls}>
                      <option value="">Seleccionar departamento...</option>
                      {departments.map(d => <option key={d.departamentos_ID} value={d.departamentos_ID}>{d.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Responsable" required>
                    <select value={form.user_ID} onChange={e => set('user_ID', e.target.value)} className={inputCls}>
                      <option value="">Seleccionar responsable...</option>
                      {users.map(u => <option key={u.user_ID} value={u.user_ID}>{fullName(u)}</option>)}
                    </select>
                  </Field>

                  {/* Resumen */}
                  <div className="mt-6 bg-muted/40 rounded-2xl border border-border p-4">
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">Resumen</h3>
                    <SummaryRow label="Nombre" value={form.name} />
                    {form.descripcion && <SummaryRow label="Descripción" value={form.descripcion.slice(0, 80) + (form.descripcion.length > 80 ? '…' : '')} />}
                    {form.fecha_inicio && <SummaryRow label="Inicio" value={formatDate(form.fecha_inicio)} />}
                    {form.fecha_entrega && <SummaryRow label="Entrega" value={formatDate(form.fecha_entrega)} />}
                    {form.costo && <SummaryRow label="Costo" value={`₡${parseFloat(form.costo).toLocaleString('es-CR')}`} />}
                    {selectedEstado && (
                      <SummaryRow label="Estado" value={selectedEstado.name} badge badgeStyle={STATUS_STYLE[selectedEstado.name]} />
                    )}
                    {selectedPrioridad && (
                      <SummaryRow label="Prioridad" value={selectedPrioridad.name} badge badgeStyle={PRIORITY_STYLE[selectedPrioridad.name]} />
                    )}
                    {selectedDept && <SummaryRow label="Departamento" value={selectedDept.name} />}
                    {selectedUser && <SummaryRow label="Responsable" value={fullName(selectedUser)} />}
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ── Footer navegación ── */}
      <div className="bg-card border-t border-border px-6 py-4 flex items-center justify-between flex-shrink-0">
        <button
          onClick={step === 0 ? () => navigate(-1) : goPrev}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground rounded-xl transition-all active:scale-[0.98]"
        >
          <ChevronLeft size={15} />
          {step === 0 ? 'Cancelar' : 'Anterior'}
        </button>

        <div className="flex gap-1">
          {STEP_LABELS.map((_, i) => (
            <div key={i} className={cn('w-1.5 h-1.5 rounded-full transition-all', i === step ? 'bg-ocean-500 w-4' : 'bg-border')} />
          ))}
        </div>

        {step < 2 ? (
          <button
            onClick={goNext}
            className="flex items-center gap-1.5 px-4 py-2 bg-ocean-500 hover:bg-ocean-600 text-white text-sm font-semibold rounded-xl transition-all active:scale-[0.98]"
          >
            Siguiente <ChevronRight size={15} />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-1.5 px-5 py-2 bg-ocean-500 hover:bg-ocean-600 text-white text-sm font-semibold rounded-xl transition-all active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? 'Creando...' : <>
              <Check size={14} /> Crear proyecto
            </>}
          </button>
        )}
      </div>
    </div>
  )
}
