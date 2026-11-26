import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Clock, X } from 'lucide-react'
import { toast } from 'sonner'
import { decidirSolicitud, getSolicitud, retirarSolicitud } from '@/lib/api'
import type { PasoAprobacion } from '@/types'
import { cn, formatDate, formatearFechaHora } from '@/lib/utils'
import { mensajeDeError } from '@/lib/errores'
import { CLASE_ESTADO_SOLICITUD, resumenDeSolicitud } from '@/lib/solicitudes'
import { useMoneda } from '@/hooks/useMarca'
import { confirmar } from '@/lib/confirmar'
import Dialogo from '@/components/common/Dialogo'

function Paso({ p }: { p: PasoAprobacion }) {
  const icono = p.estado === 'aprobado' ? <Check size={13} /> : p.estado === 'rechazado' ? <X size={13} /> : <Clock size={13} />
  return (
    <li className="flex gap-3">
      <span aria-hidden="true" className={cn(
        'mt-0.5 h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0',
        p.estado === 'aprobado' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200'
          : p.estado === 'rechazado' ? 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200' : 'bg-muted text-muted-foreground',
      )}>{icono}</span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{p.orden}. {p.nivel_display} · {p.estado_display}</p>
        <p className="text-xs text-muted-foreground">
          {p.decidido_por_nombre
            ? `${p.decidido_por_nombre}, ${formatearFechaHora(p.decidido_en)}`
            : p.estado === 'pendiente' && p.vence ? `Responder antes del ${formatDate(p.vence)}${p.escalado ? ' · vencido: también lo puede decidir el nivel siguiente' : ''}` : ''}
        </p>
        {p.comentario && <p className="text-xs text-foreground mt-0.5">«{p.comentario}»</p>}
      </div>
    </li>
  )
}

/** Una solicitud: qué pide, por qué, quién la decide y en qué va. Aprobar, rechazar o retirar. */
export default function DetalleSolicitud({ numero, onCerrar }: { numero: number; onCerrar: () => void }) {
  const qc = useQueryClient()
  const { formatear } = useMoneda()
  const { data: s } = useQuery({ queryKey: ['solicitud', numero], queryFn: () => getSolicitud(numero) })
  const [comentario, setComentario] = useState('')
  const [enviando, setEnviando] = useState(false)

  const refrescar = async () => {
    await qc.invalidateQueries({ queryKey: ['solicitudes'] })
    await qc.invalidateQueries({ queryKey: ['solicitud', numero] })
    await qc.invalidateQueries({ queryKey: ['project'] })
  }
  const decidir = async (aprobar: boolean) => {
    if (!aprobar && !comentario.trim()) { toast.error('Para rechazar, explique el motivo.'); return }
    setEnviando(true)
    try {
      const r = await decidirSolicitud(numero, aprobar, comentario.trim())
      toast.success(r.estado === 'aprobada' ? `Aprobada. ${r.resultado}` : r.estado === 'rechazada' ? 'Solicitud rechazada.' : 'Paso aprobado: sigue el nivel siguiente.')
      setComentario('')
      await refrescar()
    } catch (err) {
      toast.error(mensajeDeError(err, 'No se pudo registrar la decisión.'))
    } finally {
      setEnviando(false)
    }
  }
  const retirar = async () => {
    if (!(await confirmar({ titulo: '¿Retirar la solicitud?', mensaje: 'Deja de esperar aprobación. Queda en el historial.', accion: 'Retirar' }))) return
    try {
      await retirarSolicitud(numero)
      toast.success('Solicitud retirada.')
      await refrescar()
    } catch (err) {
      toast.error(mensajeDeError(err, 'No se pudo retirar.'))
    }
  }

  return (
    <Dialogo titulo={`Solicitud N.º ${numero}`} onCerrar={onCerrar} fondo="bg-black/50" cerrarAlTocarFondo>
      <div className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-2xl space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">N.º {numero} · {s?.tipo_nombre ?? '…'}</h2>
            {s && (
              <p className="text-xs text-muted-foreground">
                <Link to={`/projects/${s.proyecto}`} className="font-semibold hover:underline">{s.proyecto_nombre}</Link>
                {s.tarea_nombre && <> · tarea {s.tarea_nombre}</>} · pidió {s.solicitante_nombre || 'alguien'} el {formatearFechaHora(s.creada_en)}
              </p>
            )}
          </div>
          <button type="button" aria-label="Cerrar" onClick={onCerrar} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
        </div>
        {!s ? <div className="h-32 bg-muted rounded-xl animate-pulse" /> : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', CLASE_ESTADO_SOLICITUD[s.estado])}>{s.estado_display}</span>
              {resumenDeSolicitud(s, formatear) && <span className="text-sm font-semibold text-foreground">{resumenDeSolicitud(s, formatear)}</span>}
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Justificación</p>
              <p className="text-sm text-foreground whitespace-pre-line">{s.justificacion}</p>
            </div>
            {s.resultado && (
              <p className={cn('text-sm rounded-xl px-3 py-2', s.aplicada ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-100' : 'bg-muted text-foreground')}>
                {s.aplicada ? 'Orden de cambio aplicada: ' : ''}{s.resultado}
              </p>
            )}
            <section aria-label="Aprobaciones">
              <p className="text-xs font-semibold text-muted-foreground mb-2">Aprobaciones</p>
              <ol className="space-y-2">{s.pasos.map(p => <Paso key={p.orden} p={p} />)}</ol>
            </section>
            {s.puedo_decidir && (
              <div className="space-y-2 border-t border-border pt-3">
                <label htmlFor="sol-comentario" className="text-xs font-semibold text-muted-foreground">Comentario (obligatorio para rechazar)</label>
                <textarea id="sol-comentario" rows={2} maxLength={2000} value={comentario} onChange={e => setComentario(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-background border border-input rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                <div className="flex justify-end gap-2">
                  <button type="button" disabled={enviando} onClick={() => decidir(false)}
                    className="px-4 py-2 text-sm font-semibold rounded-xl border border-border hover:bg-destructive/10 hover:text-destructive disabled:opacity-60">Rechazar</button>
                  <button type="button" disabled={enviando} onClick={() => decidir(true)}
                    className="px-4 py-2 text-sm font-semibold rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white disabled:opacity-60">Aprobar</button>
                </div>
              </div>
            )}
            {s.puedo_retirar && (
              <div className="flex justify-end">
                <button type="button" onClick={retirar} className="text-xs font-semibold text-muted-foreground hover:text-foreground underline">Retirar la solicitud</button>
              </div>
            )}
          </>
        )}
      </div>
    </Dialogo>
  )
}
