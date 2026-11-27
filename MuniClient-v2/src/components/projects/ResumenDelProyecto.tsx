import type { Hito, Project } from '@/types'
import { formatDate, hoyLocal, isOverdue } from '@/lib/utils'
import { useMoneda } from '@/hooks/useMarca'

const MAX_HITOS = 4

/** Lo que muestra el tooltip de un proyecto en el Cronograma y en Reportes. */
export default function ResumenDelProyecto({ proyecto: p, hitos }: { proyecto: Project; hitos?: Hito[] }) {
  const { formatear } = useMoneda()
  const n = p.solicitudes_abiertas ?? 0
  const hoy = hoyLocal()
  return (
    <>
      <p className="text-sm font-semibold">{p.name}</p>
      <p className="text-muted-foreground">
        {isOverdue(p) ? 'Vencido' : p.estado_ID?.name ?? '—'} · prioridad {p.prioridad_ID?.name?.toLowerCase() ?? '—'}
      </p>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
        <dt className="text-muted-foreground">Fechas</dt>
        <dd>{formatDate(p.fecha_inicio)} al {formatDate(p.fecha_entrega)}</dd>
        <dt className="text-muted-foreground">Avance</dt>
        <dd>{p.avance ?? 0}&nbsp;%</dd>
        <dt className="text-muted-foreground">Responsable</dt>
        <dd>{p.user_ID ? `${p.user_ID.first_name} ${p.user_ID.last_name}` : '—'}</dd>
        <dt className="text-muted-foreground">Presupuesto</dt>
        <dd>{formatear(p.costo_total ?? p.costo ?? 0)} · ejecutado {formatear(p.costo_ejecutado ?? 0)}</dd>
        <dt className="text-muted-foreground">Solicitudes</dt>
        <dd>{n === 0 ? 'Ninguna abierta' : n === 1 ? '1 abierta' : `${n} abiertas`}</dd>
        {hitos && hitos.length > 0 && (
          <>
            <dt className="text-muted-foreground">Hitos</dt>
            <dd>
              <ul>
                {hitos.slice(0, MAX_HITOS).map(h => (
                  <li key={h.hito_ID}>
                    {h.nombre}: {h.fecha_real ? `cumplido el ${formatDate(h.fecha_real)}`
                      : `${h.fecha_prevista < hoy ? 'atrasado, era' : 'previsto'} el ${formatDate(h.fecha_prevista)}`}
                  </li>
                ))}
                {hitos.length > MAX_HITOS && <li>y {hitos.length - MAX_HITOS} más</li>}
              </ul>
            </dd>
          </>
        )}
      </dl>
    </>
  )
}
