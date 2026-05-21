import { useNavigate } from 'react-router-dom'
import { Check, CheckCheck, Inbox } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { useNotificaciones, useMarcarLeida, useMarcarTodasLeidas } from '@/hooks/useNotificaciones'
import type { Notificacion } from '@/types'

interface Props {
  onClose: () => void
}

const TIPO_COLOR: Record<string, string> = {
  vencimiento_proyecto: 'bg-red-500',
  vencimiento_tarea: 'bg-orange-500',
  cambio_estado: 'bg-blue-500',
  asignacion: 'bg-purple-500',
  delegacion: 'bg-emerald-500',
  ajuste_presupuesto: 'bg-amber-500',
  comentario: 'bg-sky-500',
  general: 'bg-slate-500',
}

export default function NotificationPanel({ onClose }: Props) {
  const navigate = useNavigate()
  const { data: notifs = [], isLoading } = useNotificaciones()
  const marcar = useMarcarLeida()
  const marcarTodas = useMarcarTodasLeidas()

  const handleClick = (n: Notificacion) => {
    if (!n.leida) marcar.mutate(n.notificacion_ID)
    if (n.link) navigate(n.link)
    onClose()
  }

  return (
    <div className="flex flex-col max-h-[500px]">
      <header className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="font-semibold text-foreground">Notificaciones</h3>
        {notifs.some(n => !n.leida) && (
          <button
            onClick={() => marcarTodas.mutate()}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Marcar todas
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-6 text-center text-sm text-muted-foreground">Cargando…</div>
        ) : notifs.length === 0 ? (
          <div className="p-8 text-center">
            <Inbox className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">Sin notificaciones</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {notifs.slice(0, 20).map(n => (
              <li key={n.notificacion_ID}>
                <button
                  onClick={() => handleClick(n)}
                  className={`flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-accent transition ${
                    n.leida ? '' : 'bg-primary/5'
                  }`}
                >
                  <span
                    className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                      TIPO_COLOR[n.tipo] ?? 'bg-slate-500'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-snug ${n.leida ? 'text-muted-foreground' : 'font-medium text-foreground'}`}>
                      {n.titulo}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.mensaje}</p>
                    <p className="text-[11px] text-muted-foreground/70 mt-1">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: es })}
                    </p>
                  </div>
                  {!n.leida && (
                    <Check
                      className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100"
                      onClick={e => {
                        e.stopPropagation()
                        marcar.mutate(n.notificacion_ID)
                      }}
                    />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
