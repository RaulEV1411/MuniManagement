import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Circle, Clock, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { actualizarHito, borrarHito, crearHito, getHitos } from '@/lib/api'
import type { Hito } from '@/types'
import { mensajeDeError } from '@/lib/errores'
import { confirmar } from '@/lib/confirmar'
import { formatDate, hoyLocal } from '@/lib/utils'

const campo = 'px-3 py-2 text-sm bg-background border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'

/** Hitos del proyecto: se cumplen al anotar la fecha real. */
export default function HitosPanel({ proyectoId, puedeEditar }: { proyectoId: string; puedeEditar: boolean }) {
  const qc = useQueryClient()
  const queryKey = ['hitos', proyectoId]
  const { data: hitos = [], isLoading } = useQuery<Hito[]>({ queryKey, queryFn: () => getHitos(proyectoId) })
  const [nombre, setNombre] = useState('')
  const [fecha, setFecha] = useState('')
  const hoy = hoyLocal()
  const intentar = async (accion: () => Promise<unknown>, error: string) => {
    try {
      await accion()
      // Sin cancelar, si la lista todavía estaba cargando, la recarga se engancha a esa petición (que no trae lo nuevo).
      await qc.cancelQueries({ queryKey })
      await qc.invalidateQueries({ queryKey })
      return true
    } catch (err) {
      toast.error(mensajeDeError(err, error))
      return false
    }
  }
  const cumplidos = hitos.filter(h => h.cumplido).length

  return (
    <section aria-labelledby="hitos-titulo" className="rounded-2xl border border-border bg-card p-5">
      <header className="mb-3">
        <h3 id="hitos-titulo" className="text-base font-semibold text-foreground">Hitos</h3>
        {hitos.length > 0 && <p className="text-xs text-muted-foreground">{cumplidos} de {hitos.length} cumplidos</p>}
      </header>

      {isLoading ? <div className="h-12 bg-muted rounded-xl animate-pulse" /> : hitos.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">Sin hitos.</p>
      ) : (
        <ul className="space-y-1.5">
          {hitos.map(h => {
            const vencido = !h.cumplido && h.fecha_prevista < hoy
            return (
              <li key={h.hito_ID} className="flex items-center gap-3 rounded-lg border border-border/60 bg-background px-3 py-2">
                {h.cumplido
                  ? <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-600" aria-hidden />
                  : vencido ? <Clock className="h-4 w-4 flex-shrink-0 text-red-600" aria-hidden />
                    : <Circle className="h-4 w-4 flex-shrink-0 text-muted-foreground" aria-hidden />}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${h.cumplido ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{h.nombre}</p>
                  <p className={`text-xs ${vencido ? 'text-red-700 dark:text-red-400' : 'text-muted-foreground'}`}>
                    {h.cumplido ? `Cumplido el ${formatDate(h.fecha_real)} · previsto el ${formatDate(h.fecha_prevista)}`
                      : `${vencido ? 'Atrasado: previsto' : 'Previsto'} el ${formatDate(h.fecha_prevista)}`}
                  </p>
                </div>
                {puedeEditar && (
                  <>
                    <button type="button" aria-label={`${h.cumplido ? 'Desmarcar' : 'Marcar cumplido'}: ${h.nombre}`}
                      onClick={() => intentar(() => actualizarHito(h.hito_ID, { fecha_real: h.cumplido ? null : hoy }), 'No se pudo cambiar el hito.')}
                      className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted whitespace-nowrap">
                      {h.cumplido ? 'Desmarcar' : 'Marcar cumplido'}
                    </button>
                    <button type="button" aria-label={`Borrar el hito ${h.nombre}`}
                      onClick={async () => {
                        if (!(await confirmar({ titulo: `¿Borrar el hito «${h.nombre}»?`, mensaje: 'Queda en la auditoría.', accion: 'Borrar' }))) return
                        intentar(() => borrarHito(h.hito_ID), 'No se pudo borrar el hito.')
                      }}
                      className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                      <Trash2 size={13} />
                    </button>
                  </>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {puedeEditar && (
        <form className="mt-3 flex flex-wrap gap-2" onSubmit={async e => {
          e.preventDefault()
          if (!nombre.trim() || !fecha) return
          const ok = await intentar(() => crearHito({ proyecto: proyectoId, nombre: nombre.trim(), fecha_prevista: fecha }), 'No se pudo agregar el hito.')
          if (ok) { setNombre(''); setFecha('') }
        }}>
          <input aria-label="Nombre del hito" required maxLength={120} value={nombre} onChange={e => setNombre(e.target.value)}
            placeholder="Diseño aprobado, orden de inicio…" className={`${campo} flex-1 min-w-48`} />
          <input aria-label="Fecha prevista del hito" required type="date" value={fecha} onChange={e => setFecha(e.target.value)} className={campo} />
          <button type="submit" className="px-4 py-2 bg-ocean-500 hover:bg-ocean-600 text-white text-xs font-semibold rounded-xl">Agregar hito</button>
        </form>
      )}
    </section>
  )
}
