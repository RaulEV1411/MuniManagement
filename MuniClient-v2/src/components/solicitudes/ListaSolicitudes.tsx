import type { Solicitud } from '@/types'
import { cn, formatDate } from '@/lib/utils'
import { CLASE_ESTADO_SOLICITUD, resumenDeSolicitud } from '@/lib/solicitudes'
import { useMoneda } from '@/hooks/useMarca'

/** Filas de solicitudes; cada una abre su detalle. */
export default function ListaSolicitudes({ solicitudes, onAbrir, conProyecto = true }: {
  solicitudes: Solicitud[]
  onAbrir: (numero: number) => void
  conProyecto?: boolean
}) {
  const { formatear } = useMoneda()
  return (
    <ul className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
      {solicitudes.map(s => {
        const resumen = resumenDeSolicitud(s, formatear)
        return (
          <li key={s.numero}>
            <button type="button" onClick={() => onAbrir(s.numero)} className="w-full text-left px-4 py-3 hover:bg-muted/40 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-xs font-semibold text-muted-foreground tabular-nums">N.º {s.numero}</span>
              <span className="text-sm font-semibold text-foreground">{s.tipo_nombre}</span>
              {resumen && <span className="text-sm text-foreground">{resumen}</span>}
              {conProyecto && <span className="text-xs text-muted-foreground">· {s.proyecto_nombre}</span>}
              <span className="ml-auto flex items-center gap-2">
                {s.vence && <span className="text-xs text-muted-foreground">vence {formatDate(s.vence)}</span>}
                {s.puedo_decidir && <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-sunset-50 text-sunset-900 dark:bg-sunset-500/10 dark:text-sunset-100">Le toca</span>}
                <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', CLASE_ESTADO_SOLICITUD[s.estado])}>{s.estado_display}</span>
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
