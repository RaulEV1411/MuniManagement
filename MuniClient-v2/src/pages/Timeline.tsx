import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { GanttChartSquare, ChevronDown } from 'lucide-react'
import { getProjects, getDepartments, getEstados } from '@/lib/api'
import { type Project, type Department, type Estado } from '@/types'
import { cn, isOverdue } from '@/lib/utils'
import ErrorDeCarga from '@/components/common/ErrorDeCarga'
import { COLOR_VENCIDO, claseRelleno, colorDeEstado, conColor } from '@/lib/colores'
import { useTituloDePagina } from '@/hooks/useMarca'

function toDate(s: string | null | undefined): Date | null {
  if (!s) return null
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}

function addDays(d: Date, n: number) {
  const r = new Date(d); r.setDate(r.getDate() + n); return r
}

function diffDays(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 86400000)
}

export default function TimelinePage() {
  useTituloDePagina('Cronograma')
  const navigate = useNavigate()
  const [deptFilter, setDeptFilter] = useState('')

  const { data: projects = [], isLoading, isError, error, refetch } = useQuery<Project[]>({
    queryKey: ['projects', 'timeline', deptFilter],
    queryFn: () => getProjects({ ...(deptFilter && { departamento: deptFilter }), orden: 'entrega' }),
  })
  const { data: estados = [] } = useQuery<Estado[]>({ queryKey: ['estados'], queryFn: getEstados, staleTime: 300_000 })
  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: getDepartments,
  })

  const filtered = projects

  const { start, end, days } = useMemo(() => {
    const dates: Date[] = []
    filtered.forEach(p => {
      const s = toDate(p.fecha_inicio)
      const e = toDate(p.fecha_entrega)
      if (s) dates.push(s)
      if (e) dates.push(e)
    })
    if (dates.length === 0) {
      const today = new Date()
      return { start: today, end: addDays(today, 60), days: 60 }
    }
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())))
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())))
    const s = addDays(minDate, -3)
    const e = addDays(maxDate, 5)
    return { start: s, end: e, days: Math.max(diffDays(s, e), 1) }
  }, [filtered])

  const today = new Date()
  const todayOffset = Math.max(0, Math.min(100, (diffDays(start, today) / days) * 100))
  const hasToday = today >= start && today <= end

  const months: { label: string; pct: number }[] = useMemo(() => {
    const result: { label: string; pct: number }[] = []
    let cur = new Date(start.getFullYear(), start.getMonth(), 1)
    while (cur <= end) {
      const monthStart = cur < start ? start : cur
      const nextMonth  = new Date(cur.getFullYear(), cur.getMonth() + 1, 1)
      const monthEnd   = nextMonth > end ? end : nextMonth
      const width      = (diffDays(monthStart, monthEnd) / days) * 100
      result.push({
        label: cur.toLocaleDateString('es-CR', { month: 'short', year: '2-digit' }),
        pct:   width,
      })
      cur = nextMonth
    }
    return result
  }, [start, end, days])

  if (isError) return <ErrorDeCarga error={error} onReintentar={refetch} que="los proyectos" />

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-card border-b border-border px-6 flex items-center gap-3 flex-shrink-0" style={{ height: 72 }}>
        <div className="w-9 h-9 rounded-xl bg-ocean-500 flex items-center justify-center flex-shrink-0">
          <GanttChartSquare size={16} className="text-white" />
        </div>
        <div className="flex-1">
          <h1 className="text-base font-bold text-foreground">Cronograma de proyectos</h1>
          {!isLoading && (
            <p className="text-xs text-muted-foreground">{filtered.length} proyecto{filtered.length !== 1 ? 's' : ''}</p>
          )}
        </div>
        <div className="relative flex-shrink-0">
          <select
            aria-label="Filtrar por departamento"
            value={deptFilter}
            onChange={e => setDeptFilter(e.target.value)}
            className="pl-2.5 pr-7 py-1.5 text-xs bg-background border border-input rounded-xl text-foreground appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Todos los departamentos</option>
            {departments.map(d => (
              <option key={d.departamentos_ID} value={d.departamentos_ID}>{d.name}</option>
            ))}
          </select>
          <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      {/* Gantt */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
            <GanttChartSquare size={32} className="text-muted-foreground/30" />
            <p className="text-sm font-medium text-foreground">Sin proyectos</p>
            <p className="text-xs text-muted-foreground">No hay proyectos con el filtro seleccionado</p>
          </div>
        ) : (
          <div className="min-w-[700px]">
            {/* Encabezado de meses */}
            <div className="flex h-7 mb-1 ml-48">
              {months.map((m, i) => (
                <div
                  key={i}
                  style={{ width: `${m.pct}%` }}
                  className="flex-shrink-0 text-[10px] font-semibold text-muted-foreground border-l border-border first:border-l-0 px-1.5 flex items-center"
                >
                  {m.label}
                </div>
              ))}
            </div>

            {/* Filas de proyectos */}
            <div className="space-y-1.5 relative">
              {/* Línea de hoy */}
              {/* Se ubica sobre la zona de barras (sin la columna de nombres de 12rem). */}
              {hasToday && (
                <div className="absolute inset-y-0 left-48 right-0 pointer-events-none z-10">
                  <div className="absolute top-0 bottom-0 w-px bg-red-400/70" style={{ left: `${todayOffset}%` }} />
                </div>
              )}

              {filtered.map(p => {
                const s   = toDate(p.fecha_inicio)
                const e   = toDate(p.fecha_entrega)
                const od  = isOverdue(p)

                let leftPct  = 0
                let widthPct = 5
                if (s && e) {
                  leftPct  = (diffDays(start, s) / days) * 100
                  widthPct = Math.max((diffDays(s, e) / days) * 100, 2)
                } else if (s) {
                  leftPct  = (diffDays(start, s) / days) * 100
                  widthPct = 3
                }
                leftPct  = Math.max(0, Math.min(leftPct, 98))
                widthPct = Math.min(widthPct, 100 - leftPct)

                return (
                  <div
                    key={p.proyect_ID}
                    className="flex items-center gap-0 h-10 group cursor-pointer"
                    onClick={() => navigate(`/projects/${p.proyect_ID}`)}
                  >
                    {/* Nombre */}
                    <div className="w-48 flex-shrink-0 pr-3 flex items-center">
                      <p className="text-xs font-medium text-foreground group-hover:text-ocean-500 dark:group-hover:text-ocean-200 transition-colors truncate">
                        {p.name}
                      </p>
                    </div>

                    {/* Barra */}
                    <div className="flex-1 h-full flex items-center relative">
                      <div className="w-full h-7 relative">
                        <div
                          className={cn(
                            'absolute h-full rounded-lg flex items-center px-2 transition-all group-hover:opacity-90 overflow-hidden',
                            claseRelleno,
                            p.prioridad_ID && 'border-l-4',
                          )}
                          style={{
                            ...conColor(colorDeEstado(od, p.estado_ID)),
                            left: `${leftPct}%`, width: `${widthPct}%`, minWidth: 8,
                            borderLeftColor: p.prioridad_ID?.color,
                          }}
                          title={`${p.name} · ${od ? 'Vencido' : p.estado_ID?.name ?? ''} · prioridad ${p.prioridad_ID?.name ?? '—'}`}
                        >
                          <span className="text-[9px] font-semibold text-white truncate hidden sm:block">
                            {p.departamento_ID?.name}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Leyenda */}
            <div className="flex items-center gap-4 mt-6 pt-4 border-t border-border flex-wrap">
              {[...estados.map(e => ({ name: e.name, color: e.color })), { name: 'Vencido', color: COLOR_VENCIDO }].map(s => (
                <div key={s.name} className="flex items-center gap-1.5">
                  <div className={cn('w-3 h-3 rounded-sm', claseRelleno)} style={conColor(s.color)} />
                  <span className="text-[10px] text-muted-foreground">{s.name}</span>
                </div>
              ))}
              {hasToday && (
                <div className="flex items-center gap-1.5">
                  <div className="w-px h-3 bg-red-400" />
                  <span className="text-[10px] text-muted-foreground">Hoy</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
