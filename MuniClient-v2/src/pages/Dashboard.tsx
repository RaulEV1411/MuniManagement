import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { keepPreviousData, useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FolderOpen, Clock, CheckCircle2, AlertTriangle,
  Search, LayoutList, LayoutGrid, Plus, X, ChevronDown,
  TrendingUp, RefreshCw, Columns3, User,
  ChevronLeft, ChevronRight, ImageIcon, Upload, Zap,
} from 'lucide-react'
import { getProyectosPagina, getResumenProyectos, uploadProjectImage, patchProject, getEstados, getPrioridades } from '@/lib/api'
import { type Project, type Estado, type Prioridad } from '@/types'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { cn, isOverdue, daysUntil, formatDate } from '@/lib/utils'
import { useAppStore } from '@/store/app'
import { toast } from 'sonner'
import ImageLightbox from '@/components/common/ImageLightbox'
import { mensajeDeError } from '@/lib/errores'
import ErrorDeCarga from '@/components/common/ErrorDeCarga'
import RazonModal from '@/components/common/RazonModal'
import { ESTADOS_CON_MOTIVO } from '@/lib/estados'
import { useValorDiferido } from '@/hooks/useValorDiferido'
import { claseEtiqueta, claseRelleno, colorDeEstado, conColor } from '@/lib/colores'

// ── Cambio rápido de estado ───────────────────────────────────────────────────
function StatusQuickChange({ project }: { project: Project }) {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { data: estados = [] } = useQuery<Estado[]>({ queryKey: ['estados'], queryFn: getEstados, staleTime: 300_000 })
  const [conMotivo, setConMotivo] = useState<Estado | null>(null)
  const { mutate, isPending } = useMutation({
    mutationFn: ({ estadoId, razon }: { estadoId: string; razon?: string }) =>
      patchProject(project.proyect_ID, { estado_ID: estadoId, ...(razon && { razon }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['projects'] }); toast.success('Estado actualizado'); setOpen(false) },
    onError: err => toast.error(mensajeDeError(err, 'Error al actualizar estado')),
  })

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const currentStatus = isOverdue(project) ? 'Vencido' : (project.estado_ID?.name ?? '')

  return (
    <div ref={ref} className="relative inline-flex" onClick={e => e.stopPropagation()}>
      <button
        onClick={() => setOpen(v => !v)}
        disabled={isPending}
        className={cn(
          'flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full transition-all',
          claseEtiqueta,
          'hover:ring-2 hover:ring-offset-1 hover:ring-current/30 cursor-pointer',
        )}
        style={conColor(colorDeEstado(isOverdue(project), project.estado_ID))}
        title="Cambiar estado"
      >
        {isPending ? <RefreshCw size={9} className="animate-spin" /> : <Zap size={9} />}
        {currentStatus}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.1 }}
            className="absolute top-full mt-1 left-0 z-50 bg-card border border-border rounded-xl shadow-xl overflow-hidden min-w-[130px]"
          >
            {estados.map(e => (
              <button
                key={e.estado_ID}
                onClick={() => {
                  if (ESTADOS_CON_MOTIVO.includes(e.name) && e.estado_ID !== project.estado_ID?.estado_ID) {
                    setOpen(false)
                    setConMotivo(e)
                  } else {
                    mutate({ estadoId: e.estado_ID })
                  }
                }}
                className={cn(
                  'flex items-center gap-2 w-full px-3 py-2 text-[11px] font-medium text-left hover:bg-accent transition-colors',
                  e.estado_ID === project.estado_ID?.estado_ID && 'bg-accent',
                )}
              >
                <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', claseRelleno)} style={conColor(e.color)} />
                {e.name}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      {conMotivo && (
        <RazonModal
          title={`Pasar a ${conMotivo.name}`}
          description="Indique el motivo; queda en el historial del proyecto."
          onConfirm={razon => { mutate({ estadoId: conMotivo.estado_ID, razon }); setConMotivo(null) }}
          onClose={() => setConMotivo(null)}
        />
      )}
    </div>
  )
}

function StatCard({ icon: Icon, value, label, color, alert }: {
  icon: React.ElementType; value: number; label: string; color: string; alert?: boolean
}) {
  return (
    <div className={cn(
      'flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold',
      alert
        ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400'
        : 'bg-card border-border text-muted-foreground',
    )}>
      <Icon size={12} className={alert ? '' : color} />
      <span className={alert ? '' : 'text-foreground font-bold'}>{value}</span>
      <span className="hidden xl:inline font-normal">{label}</span>
    </div>
  )
}

// ── Carrusel con lightbox ────────────────────────────────────────────────────
function ImageCarousel({ images }: { images: Array<{ imagen_ID: string; url: string }> }) {
  const [idx, setIdx]         = useState(0)
  const [paused, setPaused]   = useState(false)
  const [lightbox, setLightbox] = useState<number | null>(null)

  useEffect(() => {
    if (images.length <= 1 || paused) return
    const t = setInterval(() => setIdx(i => (i + 1) % images.length), 3000)
    return () => clearInterval(t)
  }, [images.length, paused])

  const prev = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIdx(i => (i - 1 + images.length) % images.length)
  }
  const next = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIdx(i => (i + 1) % images.length)
  }

  return (
    <>
      <div
        className="h-36 bg-muted overflow-hidden relative group/car"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <AnimatePresence mode="wait">
          <motion.img
            key={idx}
            src={images[idx].url}
            alt=""
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="w-full h-full object-cover cursor-zoom-in"
            onClick={e => { e.stopPropagation(); setLightbox(idx) }}
          />
        </AnimatePresence>

        {/* Prev / Next */}
        {images.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-black/50 text-white opacity-0 group-hover/car:opacity-100 transition-opacity hover:bg-black/70"
            >
              <ChevronLeft size={12} />
            </button>
            <button
              onClick={next}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-black/50 text-white opacity-0 group-hover/car:opacity-100 transition-opacity hover:bg-black/70"
            >
              <ChevronRight size={12} />
            </button>
          </>
        )}

        {/* Contador */}
        {images.length > 1 && (
          <div className="absolute top-1.5 right-1.5 bg-black/50 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded-full opacity-0 group-hover/car:opacity-100 transition-opacity pointer-events-none">
            {idx + 1}/{images.length}
          </div>
        )}

        {/* Dots */}
        {images.length > 1 && (
          <div className="absolute bottom-1.5 left-0 right-0 flex justify-center gap-1">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={e => { e.stopPropagation(); setIdx(i) }}
                className={cn(
                  'w-1.5 h-1.5 rounded-full transition-all',
                  i === idx ? 'bg-white' : 'bg-white/40',
                )}
              />
            ))}
          </div>
        )}

        {/* Zoom hint */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/car:opacity-100 transition-opacity pointer-events-none">
          <div className="bg-black/30 rounded-full p-2">
            <ImageIcon size={14} className="text-white" />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {lightbox !== null && (
          <ImageLightbox
            images={images}
            initialIndex={lightbox}
            onClose={() => setLightbox(null)}
          />
        )}
      </AnimatePresence>
    </>
  )
}

// ── Vista lista ──────────────────────────────────────────────────────────────
function ProjectListRow({ project }: { project: Project }) {
  const navigate  = useNavigate()
  const overdue   = isOverdue(project)
  const status    = overdue ? 'Vencido' : project.estado_ID?.name
  const days      = project.fecha_entrega ? daysUntil(project.fecha_entrega) : null
  const thumbnail = project.images?.[0]?.url
  const imgCount  = project.images?.length ?? 0
  const [lightbox, setLightbox] = useState<number | null>(null)

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        onClick={() => navigate(`/projects/${project.proyect_ID}`)}
        className="flex items-center gap-4 px-5 py-3 hover:bg-accent/50 transition-colors cursor-pointer group border-b border-border last:border-0"
      >
        {/* Thumbnail o barra de color */}
        {thumbnail ? (
          <div className="relative flex-shrink-0">
            <img
              src={thumbnail}
              alt=""
              className="w-11 h-11 rounded-xl object-cover border border-border"
              onClick={e => { e.stopPropagation(); setLightbox(0) }}
            />
            {imgCount > 1 && (
              <span className="absolute -bottom-1 -right-1 bg-ocean-500 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {imgCount > 9 ? '9+' : imgCount}
              </span>
            )}
          </div>
        ) : (
          <div className={cn('w-1 h-9 rounded-full flex-shrink-0', claseRelleno)} style={conColor(colorDeEstado(overdue, project.estado_ID))} />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground group-hover:text-ocean-500 transition-colors truncate">
              {project.name}
            </span>
            <StatusQuickChange project={project} />
            {project.prioridad_ID?.name && (
              <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 hidden sm:inline', claseEtiqueta)} style={conColor(project.prioridad_ID.color)}>
                {project.prioridad_ID.name}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {project.departamento_ID?.name} · {project.user_ID?.first_name} {project.user_ID?.last_name}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0 text-xs text-muted-foreground">
          {days !== null && status !== 'Completado' && status !== 'Cancelado' && (
            <span className={cn(
              'hidden md:block px-2 py-0.5 rounded-full text-[10px] font-medium',
              overdue ? 'bg-red-50 text-red-500 dark:bg-red-500/10' :
              days <= 3 ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10' :
              'bg-muted text-muted-foreground',
            )}>
              {overdue ? `Vencido ${Math.abs(days)}d` : days === 0 ? 'Vence hoy' : `${days}d`}
            </span>
          )}
          <span className="hidden lg:block">{formatDate(project.fecha_entrega)}</span>
        </div>
      </motion.div>

      <AnimatePresence>
        {lightbox !== null && project.images && project.images.length > 0 && (
          <ImageLightbox
            images={project.images}
            initialIndex={lightbox}
            onClose={() => setLightbox(null)}
          />
        )}
      </AnimatePresence>
    </>
  )
}

// ── Vista grid ───────────────────────────────────────────────────────────────
function ProjectGridCard({ project }: { project: Project }) {
  const navigate = useNavigate()
  const qc       = useQueryClient()
  const overdue  = isOverdue(project)
  const images   = project.images ?? []

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    if (fileInputRef.current) fileInputRef.current.value = ''
    let done = 0, failed = 0
    let ultimoError: unknown = null
    setUploadProgress({ current: 0, total: files.length })
    for (const file of files) {
      try {
        await uploadProjectImage(project.proyect_ID, file)
        done++
        setUploadProgress({ current: done, total: files.length })
        qc.invalidateQueries({ queryKey: ['projects'] })
      } catch (err) { failed++; ultimoError = err }
    }
    setUploadProgress(null)
    if (done > 0 && failed === 0) toast.success(done > 1 ? `${done} fotos subidas` : 'Foto subida')
    else if (done > 0) toast.warning(`${done} subidas, ${failed} fallaron`, { description: mensajeDeError(ultimoError, '') })
    else toast.error(mensajeDeError(ultimoError, 'Error al subir fotos'))
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      onClick={() => navigate(`/projects/${project.proyect_ID}`)}
      className="bg-card border border-border rounded-2xl overflow-hidden cursor-pointer hover:border-ocean-200 dark:hover:border-ocean-500/30 hover:shadow-md transition-all group relative"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,image/heic,image/heif"
        multiple
        className="hidden"
        onChange={handleUpload}
      />

      {/* Imagen / zona vacía */}
      {images.length > 0 ? (
        <div className="relative">
          <ImageCarousel images={images} />
          {/* Botón subir más fotos */}
          <button
            onClick={e => { e.stopPropagation(); fileInputRef.current?.click() }}
            disabled={!!uploadProgress}
            title="Subir más fotos"
            className="absolute top-2 left-2 p-1.5 rounded-lg bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70 disabled:opacity-40 z-10"
          >
            {uploadProgress
              ? <RefreshCw size={11} className="animate-spin" />
              : <Upload size={11} />
            }
          </button>
        </div>
      ) : (
        <div
          className="h-20 bg-gradient-to-br from-ocean-500/10 via-ocean-500/5 to-transparent flex items-center justify-center border-b border-border/50 group/empty"
          onClick={e => { e.stopPropagation(); fileInputRef.current?.click() }}
        >
          {uploadProgress ? (
            <div className="flex items-center gap-1.5 text-ocean-500">
              <RefreshCw size={13} className="animate-spin" />
              <span className="text-[10px] font-medium">{uploadProgress.current}/{uploadProgress.total}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-muted-foreground/40 group-hover/empty:text-ocean-500 transition-colors">
              <ImageIcon size={14} />
              <span className="text-[10px] font-medium">Agregar foto</span>
            </div>
          )}
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h3 className="text-sm font-semibold text-foreground group-hover:text-ocean-500 transition-colors line-clamp-2 flex-1">
            {project.name}
          </h3>
          <StatusQuickChange project={project} />
        </div>

        {project.descripcion && (
          <p className="text-[11px] text-muted-foreground mb-3 line-clamp-2">{project.descripcion}</p>
        )}

        <div className="flex items-center justify-between text-[10px] text-muted-foreground gap-2">
          <span className="truncate">{project.departamento_ID?.name}</span>
          {project.fecha_entrega && (
            <span className={cn('font-medium flex-shrink-0', overdue ? 'text-red-500' : '')}>
              {formatDate(project.fecha_entrega)}
            </span>
          )}
        </div>

        {(project.prioridad_ID?.name || images.length > 0) && (
          <div className="mt-2.5 pt-2.5 border-t border-border flex items-center justify-between">
            {project.prioridad_ID?.name ? (
              <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full', claseEtiqueta)} style={conColor(project.prioridad_ID.color)}>
                {project.prioridad_ID.name}
              </span>
            ) : <span />}
            {images.length > 0 && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <ImageIcon size={9} /> {images.length}
              </span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ── Vista kanban ─────────────────────────────────────────────────────────────
function KanbanCol({ estado, projects }: { estado: Estado; projects: Project[] }) {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col min-w-[240px] max-w-[280px] flex-1">
      <div className="flex items-center gap-2 mb-3 px-1">
        <span className={cn('w-2 h-2 rounded-full flex-shrink-0', claseRelleno)} style={conColor(estado.color)} />
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{estado.name}</span>
        <span className="text-[10px] font-bold bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">{projects.length}</span>
      </div>
      <div className="space-y-2 flex-1">
        {projects.map(p => {
          const od   = isOverdue(p)
          const days = p.fecha_entrega ? daysUntil(p.fecha_entrega) : null
          const imgs = p.images ?? []
          return (
            <div
              key={p.proyect_ID}
              onClick={() => navigate(`/projects/${p.proyect_ID}`)}
              className="bg-card border border-border rounded-xl overflow-hidden cursor-pointer hover:border-ocean-300 dark:hover:border-ocean-500/40 hover:shadow-sm transition-all group"
            >
              {imgs.length > 0 ? (
                <div className="h-24 overflow-hidden relative bg-muted">
                  <img
                    src={imgs[0].url}
                    alt=""
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onClick={e => e.stopPropagation()}
                  />
                  {imgs.length > 1 && (
                    <span className="absolute top-1.5 right-1.5 bg-black/50 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded-full">
                      +{imgs.length - 1}
                    </span>
                  )}
                </div>
              ) : null}
              <div className="p-3">
                <p className="text-xs font-semibold text-foreground group-hover:text-ocean-500 transition-colors line-clamp-2 mb-1.5">{p.name}</p>
                <div className="flex items-center justify-between gap-1">
                  {p.prioridad_ID?.name && (
                    <span className={cn('text-[9px] font-medium px-1.5 py-0.5 rounded-full', claseEtiqueta)} style={conColor(p.prioridad_ID.color)}>
                      {p.prioridad_ID.name}
                    </span>
                  )}
                  {days !== null && estado.name !== 'Completado' && estado.name !== 'Cancelado' && (
                    <span className={cn('text-[9px] font-medium ml-auto',
                      od ? 'text-red-500' : days <= 3 ? 'text-amber-500' : 'text-muted-foreground',
                    )}>
                      {od ? `+${Math.abs(days)}d` : days === 0 ? 'Hoy' : `${days}d`}
                    </span>
                  )}
                </div>
                {(p.user_ID?.first_name || p.departamento_ID?.name) && (
                  <p className="text-[9px] text-muted-foreground mt-1.5 truncate">
                    {p.user_ID ? `${p.user_ID.first_name} ${p.user_ID.last_name}` : p.departamento_ID?.name}
                  </p>
                )}
              </div>
            </div>
          )
        })}
        {projects.length === 0 && (
          <div className="border-2 border-dashed border-border rounded-xl p-4 text-center">
            <p className="text-[10px] text-muted-foreground/50">Sin proyectos</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Página principal ─────────────────────────────────────────────────────────
export default function DashboardPage() {
  const navigate  = useNavigate()
  const { user }  = useAppStore()
  const [params, setParams] = useSearchParams()

  const search   = params.get('q') ?? ''
  const status   = params.get('estado') ?? 'Todos'
  const priority = params.get('prioridad') ?? 'Todas'
  const sortBy   = params.get('orden') ?? 'reciente'
  const view     = (params.get('vista') ?? 'list') as 'list' | 'grid' | 'kanban'
  const mineOnly = params.get('mios') === '1'
  const pagina   = Math.max(1, Number(params.get('pagina') ?? '1') || 1)

  const setParam = (key: string, val: string, def: string) => {
    setParams(prev => {
      const next = new URLSearchParams(prev)
      if (val === def) next.delete(key)
      else next.set(key, val)
      // Cambiar un filtro, el orden o la vista vuelve a la primera página.
      if (key !== 'pagina') next.delete('pagina')
      return next
    }, { replace: true })
  }
  const setPagina = (n: number) => setParam('pagina', String(n), '1')
  const setSearch   = (v: string) => setParam('q', v, '')
  const setStatus   = (v: string) => setParam('estado', v, 'Todos')
  const setPriority = (v: string) => setParam('prioridad', v, 'Todas')
  const setSortBy   = (v: string) => setParam('orden', v, 'reciente')
  const setView     = (v: string) => setParam('vista', v, 'list')
  const setMineOnly = (fn: (prev: boolean) => boolean) => setParam('mios', fn(mineOnly) ? '1' : '', '')

  // Filtros, orden y paginación los resuelve el servidor (antes se bajaban los primeros 200 y se
  // filtraba en el navegador, así que con más proyectos los resultados quedaban incompletos).
  const busqueda = useValorDiferido(search.trim())
  const filtros = {
    ...(busqueda && { search: busqueda }),
    ...(status !== 'Todos' && { estado: status }),
    ...(priority !== 'Todas' && { prioridad: priority }),
    ...(mineOnly && { mios: '1' }),
    orden: sortBy,
  }
  const porPagina = view === 'kanban' ? 100 : 24
  const { data: paginaActual, isLoading, refetch, isError, error, isPlaceholderData } = useQuery({
    queryKey: ['projects', 'dashboard', filtros, pagina, porPagina],
    queryFn: () => getProyectosPagina({ ...filtros, page: pagina, page_size: porPagina }),
    placeholderData: keepPreviousData,
  })
  const displayed = useMemo(() => paginaActual?.results ?? [], [paginaActual])
  const totalFiltrado = paginaActual?.count ?? 0
  const totalPaginas = Math.max(1, Math.ceil(totalFiltrado / porPagina))

  // Totales de todos los proyectos visibles, sin filtros.
  const { data: resumen } = useQuery({ queryKey: ['projects', 'resumen'], queryFn: () => getResumenProyectos() })

  const { data: estados = [] }     = useQuery<Estado[]>({ queryKey: ['estados'], queryFn: getEstados, staleTime: 300_000 })
  const { data: prioridades = [] } = useQuery<Prioridad[]>({ queryKey: ['prioridades'], queryFn: getPrioridades, staleTime: 300_000 })

  const [showChart, setShowChart] = useState(false)

  const stats = {
    total:      resumen?.total ?? 0,
    enProgreso: resumen?.en_progreso ?? 0,
    completado: resumen?.completados ?? 0,
    vencidos:   resumen?.vencidos ?? 0,
    pct:        resumen?.porcentaje_completado ?? 0,
  }

  const deptChartData = (resumen?.por_departamento ?? []).map(d => ({
    name: d.name.length > 14 ? d.name.slice(0, 13) + '…' : d.name, total: d.total, completado: d.completados,
  }))

  const hasFilters = search || status !== 'Todos' || priority !== 'Todas' || mineOnly
  const clearFilters = () => { setSearch(''); setStatus('Todos'); setPriority('Todas'); setMineOnly(() => false) }

  // Una columna por estado de Configuración; los vencidos quedan en su estado real, marcados en la tarjeta.
  const kanbanByStatus = useMemo(() => {
    const grouped: Record<string, Project[]> = {}
    estados.forEach(e => { grouped[e.estado_ID] = [] })
    displayed.forEach(p => { grouped[p.estado_ID?.estado_ID ?? '']?.push(p) })
    return grouped
  }, [displayed, estados])

  const greeting = () => {
    const h = new Date().getHours()
    return h < 12 ? 'Buenos días' : h < 18 ? 'Buenas tardes' : 'Buenas noches'
  }

  if (isError) return <ErrorDeCarga error={error} onReintentar={refetch} que="los proyectos" />

  return (
    <div className="flex flex-col h-full">

      {/* ── Header ── */}
      <div className="bg-card border-b border-border px-6 flex items-center gap-4 flex-shrink-0" style={{ height: 72 }}>
        <div className="w-10 h-10 rounded-xl bg-ocean-500 flex items-center justify-center flex-shrink-0">
          <FolderOpen size={18} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-foreground leading-tight">
            {greeting()}, {user?.first_name ?? 'Usuario'}
          </h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-muted-foreground">Municipalidad de Puntarenas</span>
            {stats.pct > 0 && !isLoading && (
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                <TrendingUp size={9} /> {stats.pct}% completado
              </span>
            )}
          </div>
        </div>
        {!isLoading && (
          <div className="hidden lg:flex items-center gap-2">
            <StatCard icon={FolderOpen}   value={stats.total}      label="Total"       color="text-ocean-500" />
            <StatCard icon={Clock}        value={stats.enProgreso}  label="En progreso" color="text-blue-500" />
            <StatCard icon={CheckCircle2} value={stats.completado}  label="Completados" color="text-emerald-500" />
            {stats.vencidos > 0 && <StatCard icon={AlertTriangle} value={stats.vencidos} label="Vencidos" color="" alert />}
            {deptChartData.length > 0 && (
              <button
                onClick={() => setShowChart(v => !v)}
                title="Ver gráfico por departamento"
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-xl border transition-all',
                  showChart
                    ? 'bg-ocean-500 text-white border-ocean-500'
                    : 'text-muted-foreground border-border hover:bg-accent',
                )}
              >
                <TrendingUp size={11} /> Gráfico
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Toolbar ── */}
      <div className="bg-card border-b border-border px-6 flex items-center gap-2 flex-shrink-0" style={{ height: 52 }}>
        <div className="relative w-64 flex-shrink-0">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar proyectos..."
            className="w-full pl-9 pr-8 py-1.5 text-sm bg-background border border-input rounded-xl text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X size={12} />
            </button>
          )}
        </div>

        {[
          { value: status,   onChange: setStatus,   opts: ['Todos', ...estados.map(e => e.name), 'Vencido'] },
          { value: priority, onChange: setPriority, opts: ['Todas', ...prioridades.map(p => p.name)] },
        ].map((f, i) => (
          <div key={i} className="relative flex-shrink-0">
            <select
              value={f.value}
              onChange={e => f.onChange(e.target.value)}
              className="pl-2.5 pr-6 py-1.5 text-xs bg-background border border-input rounded-xl text-foreground appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {f.opts.map(o => <option key={o}>{o}</option>)}
            </select>
            <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>
        ))}

        <div className="relative flex-shrink-0">
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="pl-2.5 pr-6 py-1.5 text-xs bg-background border border-input rounded-xl text-foreground appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="reciente">Recientes</option>
            <option value="nombre">Nombre</option>
            <option value="entrega">Entrega</option>
            <option value="prioridad">Prioridad</option>
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
          <span className="text-xs text-muted-foreground flex-shrink-0">{totalFiltrado} resultado{totalFiltrado !== 1 ? 's' : ''}</span>
        )}

        <button
          onClick={() => setMineOnly(v => !v)}
          title={mineOnly ? 'Ver todos los proyectos' : 'Ver solo mis proyectos'}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-xl transition-all flex-shrink-0',
            mineOnly
              ? 'bg-ocean-500 text-white'
              : 'text-muted-foreground border border-border hover:bg-accent',
          )}
        >
          <User size={12} /> Mis proyectos
        </button>

        <div className="flex border border-border rounded-xl overflow-hidden flex-shrink-0">
          {([
            { v: 'list',   icon: <LayoutList size={13} /> },
            { v: 'grid',   icon: <LayoutGrid size={13} /> },
            { v: 'kanban', icon: <Columns3 size={13} /> },
          ] as const).map(({ v, icon }, i) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn('px-2.5 py-1.5 transition-colors', i > 0 ? 'border-l border-border' : '',
                view === v ? 'bg-ocean-500 text-white' : 'text-muted-foreground hover:bg-accent')}
            >
              {icon}
            </button>
          ))}
        </div>

        <button onClick={() => refetch()} className="p-1.5 rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground transition-all flex-shrink-0">
          <RefreshCw size={13} />
        </button>

        <button
          onClick={() => navigate('/projects/new')}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-ocean-500 hover:bg-ocean-600 text-white text-xs font-semibold rounded-xl transition-all active:scale-95 flex-shrink-0"
        >
          <Plus size={13} /> Nuevo proyecto
        </button>
      </div>

      {/* ── Panel de gráfico ── */}
      <AnimatePresence>
        {showChart && deptChartData.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-b border-border bg-card/50"
          >
            <div className="px-6 py-4">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Proyectos por departamento</p>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={deptChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} barGap={2}>
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'currentColor' }} className="text-muted-foreground" axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: 'currentColor' }} className="text-muted-foreground" axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)' }}
                    labelStyle={{ fontWeight: 600 }}
                    cursor={{ fill: 'var(--accent)' }}
                  />
                  <Bar dataKey="total" name="Total" radius={[4, 4, 0, 0]} maxBarSize={32}>
                    {deptChartData.map((_, i) => (
                      <Cell key={i} fill={`hsl(${200 + i * 18}, 65%, ${55 - i * 3}%)`} />
                    ))}
                  </Bar>
                  <Bar dataKey="completado" name="Completados" radius={[4, 4, 0, 0]} maxBarSize={32} fill="hsl(145, 60%, 50%)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Contenido ── */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {isLoading ? (
          <div className={view === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3' : 'space-y-2'}>
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-card rounded-xl h-16 animate-pulse border border-border" />
            ))}
          </div>
        ) : displayed.length > 0 ? (
          <>
            <AnimatePresence mode="popLayout">
              {view === 'kanban' ? (
                <motion.div key="kanban" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4 overflow-x-auto pb-4 min-h-[400px]">
                  {estados.map(e => (
                    <KanbanCol key={e.estado_ID} estado={e} projects={kanbanByStatus[e.estado_ID] ?? []} />
                  ))}
                </motion.div>
              ) : view === 'grid' ? (
                <motion.div key="grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {displayed.map(p => <ProjectGridCard key={p.proyect_ID} project={p} />)}
                </motion.div>
              ) : (
                <motion.div key="list" className="bg-card rounded-2xl border border-border overflow-hidden">
                  {displayed.map(p => <ProjectListRow key={p.proyect_ID} project={p} />)}
                </motion.div>
              )}
            </AnimatePresence>
            <nav className="flex items-center justify-center gap-3 pt-4 text-xs text-muted-foreground" aria-label="Páginas de proyectos">
              <span>
                {view === 'kanban' && totalFiltrado > displayed.length
                  ? `Se muestran los ${displayed.length} más ${sortBy === 'reciente' ? 'recientes' : 'arriba en el orden elegido'} de ${totalFiltrado}. Use los filtros para acotar.`
                  : `${(pagina - 1) * porPagina + 1}–${(pagina - 1) * porPagina + displayed.length} de ${totalFiltrado} proyecto${totalFiltrado !== 1 ? 's' : ''}`}
              </span>
              {view !== 'kanban' && totalPaginas > 1 && (
                <span className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPagina(pagina - 1)}
                    disabled={pagina <= 1 || isPlaceholderData}
                    className="px-2.5 py-1 rounded-lg border border-border hover:bg-accent disabled:opacity-40"
                  >
                    Anterior
                  </button>
                  <span aria-current="page">Página {pagina} de {totalPaginas}</span>
                  <button
                    onClick={() => setPagina(pagina + 1)}
                    disabled={pagina >= totalPaginas || isPlaceholderData}
                    className="px-2.5 py-1 rounded-lg border border-border hover:bg-accent disabled:opacity-40"
                  >
                    Siguiente
                  </button>
                </span>
              )}
            </nav>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
              <FolderOpen size={24} className="text-muted-foreground/40" />
            </div>
            <p className="text-sm font-medium text-foreground">Sin resultados</p>
            <p className="text-xs text-muted-foreground">
              {search ? 'Ningún proyecto coincide.' : 'No hay proyectos con ese filtro.'}
            </p>
            {hasFilters
              ? <button onClick={clearFilters} className="text-xs text-ocean-500 hover:underline">Ver todos</button>
              : <button onClick={() => navigate('/projects/new')} className="flex items-center gap-2 px-4 py-2 bg-ocean-500 text-white text-sm font-semibold rounded-xl hover:bg-ocean-600 transition-all"><Plus size={13} /> Crear proyecto</button>
            }
          </div>
        )}
      </div>
    </div>
  )
}
