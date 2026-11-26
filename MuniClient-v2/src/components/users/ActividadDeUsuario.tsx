import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Laptop, LogOut } from 'lucide-react'
import { toast } from 'sonner'
import { cerrarSesionRemota, getActividad } from '@/lib/api'
import type { SesionUsuario } from '@/types'
import { cn, formatearDuracion, formatearFechaHora } from '@/lib/utils'
import { mensajeDeError } from '@/lib/errores'
import { confirmar } from '@/lib/confirmar'
import ErrorDeCarga from '@/components/common/ErrorDeCarga'
import Cambios from '@/components/auditoria/Cambios'

function Dato({ titulo, valor }: { titulo: string; valor: string | number }) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{titulo}</p>
      <p className="text-sm font-semibold text-foreground">{valor}</p>
    </div>
  )
}

function estado(s: SesionUsuario): string {
  if (s.actual) return 'Esta sesión'
  if (s.abierta) return 'Abierta'
  if (!s.cerrada_en) return 'Vencida'
  return s.cerrada_por_nombre ? `${s.motivo_cierre_display} (por ${s.cerrada_por_nombre})` : s.motivo_cierre_display || 'Cerrada'
}

/** Sesiones, tiempo conectado y últimas acciones: lo ve la persona, y quien tiene la auditoría. */
export default function ActividadDeUsuario({ usuarioId, veAuditoria }: { usuarioId: string; veAuditoria: boolean }) {
  const qc = useQueryClient()
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['actividad', usuarioId],
    queryFn: () => getActividad(usuarioId),
  })
  const cerrar = useMutation({
    mutationFn: cerrarSesionRemota,
    onSuccess: () => {
      toast.success('Sesión cerrada. En ese dispositivo tendrá que volver a entrar.')
      qc.invalidateQueries({ queryKey: ['actividad', usuarioId] })
    },
    onError: err => toast.error(mensajeDeError(err, 'No se pudo cerrar la sesión.')),
  })

  if (isLoading) return <div className="h-40 bg-muted rounded-2xl animate-pulse" />
  if (isError || !data) return <ErrorDeCarga error={error} onReintentar={refetch} que="la actividad" />

  return (
    <div className="max-w-2xl space-y-4">
      <section aria-labelledby="actividad-resumen" className="bg-card border border-border rounded-2xl p-4">
        <h3 id="actividad-resumen" className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">Resumen</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Dato titulo="Última conexión" valor={formatearFechaHora(data.ultima_conexion)} />
          <Dato titulo="Conectado (30 días)" valor={formatearDuracion(data.segundos_30_dias)} />
          <Dato titulo="Sesiones abiertas" valor={data.sesiones_abiertas} />
          <Dato titulo="Intentos fallidos" valor={`${data.fallidos_24h} en 24 h`} />
        </div>
      </section>

      <section aria-labelledby="actividad-sesiones" className="bg-card border border-border rounded-2xl p-4">
        <h3 id="actividad-sesiones" className="text-xs font-bold text-foreground uppercase tracking-wider mb-2">Sesiones</h3>
        {data.sesiones.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no hay sesiones registradas.</p>
        ) : (
          <ul className="divide-y divide-border">
            {data.sesiones.map(s => (
              <li key={s.sesion_ID} className="py-2.5 flex items-start gap-3">
                <Laptop size={16} className="mt-0.5 text-muted-foreground flex-shrink-0" aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {s.dispositivo}
                    <span className={cn(
                      'ml-2 text-[11px] font-semibold px-1.5 py-0.5 rounded-full align-middle',
                      s.abierta ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200' : 'bg-muted text-muted-foreground',
                    )}>{estado(s)}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Desde {formatearFechaHora(s.iniciada_en)} · última actividad {formatearFechaHora(s.ultima_actividad)}
                    {' · '}{formatearDuracion(s.segundos_activos)} de uso{s.ip ? ` · IP ${s.ip}` : ''}
                  </p>
                </div>
                {s.abierta && !s.actual && data.puede_cerrar && (
                  <button
                    type="button"
                    disabled={cerrar.isPending}
                    onClick={async () => {
                      if (await confirmar({
                        titulo: '¿Cerrar esta sesión?',
                        mensaje: `${s.dispositivo}: en ese dispositivo tendrá que volver a iniciar sesión. Queda en la auditoría.`,
                        accion: 'Cerrar sesión',
                      })) cerrar.mutate(s.sesion_ID)
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold border border-border rounded-xl hover:bg-destructive/10 hover:text-destructive disabled:opacity-60"
                  >
                    <LogOut size={12} aria-hidden="true" /> Cerrar sesión
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="actividad-acciones" className="bg-card border border-border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 id="actividad-acciones" className="text-xs font-bold text-foreground uppercase tracking-wider">Últimas acciones</h3>
          {veAuditoria && (
            <Link to={`/auditoria?usuario=${encodeURIComponent(usuarioId)}`} className="text-xs font-semibold text-ocean-500 dark:text-ocean-200 hover:underline">
              Ver todo en la auditoría
            </Link>
          )}
        </div>
        {data.acciones.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin acciones registradas.</p>
        ) : (
          <ul className="divide-y divide-border">
            {data.acciones.map(a => (
              <li key={a.id} className="py-2 space-y-1">
                <p className="text-sm text-foreground">
                  <span className="font-medium">{a.accion_display}</span>
                  {a.objeto_repr && <> · {a.objeto_repr}</>}
                  <span className="text-muted-foreground"> · {a.modulo_display}</span>
                  {a.resultado !== 'exito' && (
                    <span className="ml-2 text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-red-50 text-red-800 dark:bg-red-500/10 dark:text-red-200">{a.resultado_display}</span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">{formatearFechaHora(a.creado_en)}{a.motivo ? ` · ${a.motivo}` : ''}</p>
                {a.accion !== 'crear' && a.accion !== 'eliminar' && <Cambios detalle={a.detalle} />}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
