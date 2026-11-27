import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarOff, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { borrarAusencia, crearAusencia, getAusencias } from '@/lib/api'
import type { Ausencia, TipoAusencia, User } from '@/types'
import { mensajeDeError } from '@/lib/errores'
import { confirmar } from '@/lib/confirmar'
import { formatDate, hoyLocal } from '@/lib/utils'
import { NOMBRE_DE_AUSENCIA, textoDeDisponibilidad } from '@/lib/disponibilidad'

const campo = 'w-full px-3 py-2 text-sm bg-background border border-input rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-ring'

/** Disponibilidad, ausencias y carga de trabajo de una persona (pestaña Información del perfil). */
export default function DisponibilidadPanel({ usuario, puedeRegistrar }: { usuario: User; puedeRegistrar: boolean }) {
  const qc = useQueryClient()
  const queryKey = ['ausencias', usuario.user_ID]
  const { data: ausencias = [] } = useQuery<Ausencia[]>({ queryKey, queryFn: () => getAusencias(usuario.user_ID) })
  const [tipo, setTipo] = useState<TipoAusencia>('vacaciones')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [aDelegar, setADelegar] = useState<Ausencia | null>(null)
  const hoy = hoyLocal()
  const proximas = ausencias.filter(a => a.hasta >= hoy).sort((a, b) => a.desde.localeCompare(b.desde))
  const carga = usuario.carga
  const ausente = textoDeDisponibilidad(usuario)

  const refrescar = () => Promise.all([
    qc.invalidateQueries({ queryKey }),
    qc.invalidateQueries({ queryKey: ['user', usuario.user_ID] }),
  ])

  const registrar = async (e: React.FormEvent) => {
    e.preventDefault()
    setGuardando(true)
    try {
      const creada: Ausencia = await crearAusencia({ usuario: usuario.user_ID, tipo, desde, hasta })
      setDesde('')
      setHasta('')
      setADelegar(creada.proyectos_a_cargo?.length ? creada : null)
      toast.success('Ausencia registrada')
      await refrescar()
    } catch (err) {
      toast.error(mensajeDeError(err, 'No se pudo registrar la ausencia.'))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <section aria-labelledby="disponibilidad-titulo" className="bg-card border border-border rounded-2xl p-4 space-y-3">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="disponibilidad-titulo" className="text-xs font-bold text-foreground uppercase tracking-wider">Disponibilidad y carga</h3>
        <span className={ausente
          ? 'text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-200'
          : 'text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-200'}>
          {ausente ?? 'Disponible'}
        </span>
      </header>

      {carga && (
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            ['Tareas abiertas', carga.tareas_abiertas, false],
            ['Vencidas', carga.tareas_vencidas, carga.tareas_vencidas > 0],
            ['Horas pendientes', carga.horas_pendientes.toLocaleString('es-CR'), false],
            ['Proyectos a cargo', carga.proyectos_a_cargo, false],
          ].map(([etiqueta, valor, alerta]) => (
            <div key={String(etiqueta)} className="rounded-xl border border-border/60 bg-background px-3 py-2">
              <dt className="text-[11px] text-muted-foreground">{etiqueta}</dt>
              <dd className={`text-lg font-bold ${alerta ? 'text-red-700 dark:text-red-400' : 'text-foreground'}`}>{valor}</dd>
            </div>
          ))}
        </dl>
      )}

      <div>
        <h4 className="text-xs font-semibold text-muted-foreground mb-1.5">Ausencias actuales y próximas</h4>
        {proximas.length === 0 ? <p className="text-xs text-muted-foreground italic">Ninguna registrada.</p> : (
          <ul className="space-y-1.5">
            {proximas.map(a => (
              <li key={a.ausencia_ID} className="flex items-center gap-3 rounded-lg border border-border/60 bg-background px-3 py-2">
                <CalendarOff className="h-4 w-4 flex-shrink-0 text-muted-foreground" aria-hidden />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">{a.tipo ? NOMBRE_DE_AUSENCIA[a.tipo] : 'Ausencia'}{a.vigente && ' · en curso'}</p>
                  <p className="text-xs text-muted-foreground">Del {formatDate(a.desde)} al {formatDate(a.hasta)}</p>
                </div>
                {puedeRegistrar && (
                  <button type="button" aria-label={`Borrar la ausencia del ${formatDate(a.desde)} al ${formatDate(a.hasta)}`}
                    onClick={async () => {
                      if (!(await confirmar({ titulo: '¿Borrar la ausencia?', mensaje: 'Queda en la auditoría.', accion: 'Borrar' }))) return
                      try {
                        await borrarAusencia(a.ausencia_ID)
                        await refrescar()
                      } catch (err) {
                        toast.error(mensajeDeError(err, 'No se pudo borrar la ausencia.'))
                      }
                    }}
                    className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                    <Trash2 size={13} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {aDelegar && (
        <div role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
          <p className="font-semibold">Conviene delegar {aDelegar.proyectos_a_cargo!.length === 1 ? 'su proyecto' : `sus ${aDelegar.proyectos_a_cargo!.length} proyectos`} a cargo</p>
          <p className="text-xs mt-0.5">En el equipo de cada proyecto, agregue a alguien como Supervisor del {formatDate(aDelegar.desde)} al {formatDate(aDelegar.hasta)}.</p>
          <ul className="mt-2 space-y-1">
            {aDelegar.proyectos_a_cargo!.map(p => (
              <li key={p.proyect_ID}><Link to={`/projects/${p.proyect_ID}`} className="text-xs font-semibold underline underline-offset-2">{p.name}</Link></li>
            ))}
          </ul>
        </div>
      )}

      {puedeRegistrar && (
        <form onSubmit={registrar} className="grid grid-cols-2 sm:grid-cols-3 gap-2 items-end">
          <div className="space-y-1 col-span-2 sm:col-span-1">
            <label htmlFor="ausencia-tipo" className="text-xs font-semibold text-muted-foreground">Tipo de ausencia</label>
            <select id="ausencia-tipo" value={tipo} onChange={e => setTipo(e.target.value as TipoAusencia)} className={campo}>
              {Object.entries(NOMBRE_DE_AUSENCIA).map(([v, n]) => <option key={v} value={v}>{n}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="ausencia-desde" className="text-xs font-semibold text-muted-foreground">Desde</label>
            <input id="ausencia-desde" type="date" required value={desde} onChange={e => setDesde(e.target.value)} className={campo} />
          </div>
          <div className="space-y-1">
            <label htmlFor="ausencia-hasta" className="text-xs font-semibold text-muted-foreground">Hasta</label>
            <input id="ausencia-hasta" type="date" required min={desde || undefined} value={hasta} onChange={e => setHasta(e.target.value)} className={campo} />
          </div>
          <button type="submit" disabled={guardando}
            className="col-span-2 sm:col-span-3 sm:justify-self-end px-4 py-2 bg-ocean-500 hover:bg-ocean-600 text-white text-xs font-semibold rounded-xl disabled:opacity-60">
            {guardando ? 'Guardando…' : 'Registrar ausencia'}
          </button>
        </form>
      )}
    </section>
  )
}
