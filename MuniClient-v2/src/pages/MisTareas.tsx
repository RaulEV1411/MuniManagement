import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ListChecks } from 'lucide-react'
import { getMisTareas } from '@/lib/api'
import type { Task } from '@/types'
import { cn, daysUntil, formatDate } from '@/lib/utils'
import { claseEtiqueta, conColor } from '@/lib/colores'
import ErrorDeCarga from '@/components/common/ErrorDeCarga'
import { useAppStore } from '@/store/app'
import { useTituloDePagina } from '@/hooks/useMarca'

const GRUPOS = [
  { clave: 'vencidas', titulo: 'Vencidas' },
  { clave: 'semana', titulo: 'En los próximos 7 días' },
  { clave: 'despues', titulo: 'Más adelante' },
] as const

function grupoDe(t: Task): (typeof GRUPOS)[number]['clave'] {
  const dias = daysUntil(t.fecha_entrega)
  return dias < 0 ? 'vencidas' : dias <= 7 ? 'semana' : 'despues'
}

/** Las tareas abiertas de uno (asignadas o en que colabora) en todos los proyectos que ve. */
export default function MisTareasPage() {
  useTituloDePagina('Mis tareas')
  const yo = useAppStore(s => s.user?.user_ID)
  const { data: tareas = [], isLoading, isError, error, refetch } = useQuery<Task[]>({ queryKey: ['tasks', 'mias'], queryFn: getMisTareas, refetchOnMount: 'always' })

  if (isError) return <ErrorDeCarga error={error} onReintentar={refetch} que="sus tareas" />

  return (
    <div className="flex flex-col h-full">
      <div className="bg-card border-b border-border px-4 sm:px-6 py-3 flex items-center gap-3 flex-shrink-0" style={{ minHeight: 72 }}>
        <div className="w-9 h-9 rounded-xl bg-ocean-500 flex items-center justify-center flex-shrink-0">
          <ListChecks size={16} className="text-white" aria-hidden />
        </div>
        <div>
          <h1 className="text-base font-bold text-foreground">Mis tareas</h1>
          {!isLoading && (
            <p className="text-xs text-muted-foreground">
              {tareas.length} abierta{tareas.length !== 1 ? 's' : ''} en todos sus proyectos
            </p>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-5">
        {isLoading ? (
          <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-muted rounded-xl animate-pulse" />)}</div>
        ) : tareas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
            <ListChecks size={32} className="text-muted-foreground/30" aria-hidden />
            <p className="text-sm font-medium text-foreground">Sin tareas abiertas</p>
            <p className="text-xs text-muted-foreground">Aquí aparecen las tareas que le asignen o en que colabore.</p>
          </div>
        ) : GRUPOS.map(({ clave, titulo }) => {
          const delGrupo = tareas.filter(t => grupoDe(t) === clave)
          if (delGrupo.length === 0) return null
          return (
            <section key={clave} aria-labelledby={`grupo-${clave}`}>
              <h2 id={`grupo-${clave}`} className={cn('text-xs font-bold uppercase tracking-wider mb-2', clave === 'vencidas' ? 'text-red-700 dark:text-red-400' : 'text-muted-foreground')}>
                {titulo} <span className="font-semibold">({delGrupo.length})</span>
              </h2>
              <ul className="bg-card border border-border rounded-2xl overflow-hidden">
                {delGrupo.map(t => {
                  const dias = daysUntil(t.fecha_entrega)
                  return (
                    <li key={t.tareas_ID} className="relative flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-accent/40 focus-within:ring-2 focus-within:ring-inset focus-within:ring-ring">
                      <div className="flex-1 min-w-0">
                        <Link to={`/projects/${t.proyecto_ID}?tarea=${t.tareas_ID}`}
                          className="after:absolute after:inset-0 after:content-[''] focus:outline-none text-sm font-semibold text-foreground">
                          {t.name}
                        </Link>
                        <p className="text-xs text-muted-foreground truncate">
                          {t.proyecto_nombre}{t.asignado_a?.user_ID !== yo && ' · colabora'}
                        </p>
                        <span className={cn('sm:hidden inline-block mt-1 text-[11px] font-semibold px-2 py-0.5 rounded-full', claseEtiqueta)} style={conColor(t.estado_ID?.color)}>
                          {t.estado_ID?.name}
                        </span>
                      </div>
                      <span className={cn('hidden sm:inline text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0', claseEtiqueta)} style={conColor(t.estado_ID?.color)}>
                        {t.estado_ID?.name}
                      </span>
                      <span className={cn('text-xs whitespace-nowrap flex-shrink-0', dias < 0 ? 'text-red-700 dark:text-red-400 font-semibold' : 'text-muted-foreground')}>
                        {formatDate(t.fecha_entrega)}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
      </div>
    </div>
  )
}
