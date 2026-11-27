import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Plus, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { actualizarRiesgo, borrarRiesgo, crearRiesgo, getRiesgos, getUsers } from '@/lib/api'
import type { Riesgo, User } from '@/types'
import { mensajeDeError } from '@/lib/errores'
import { confirmar } from '@/lib/confirmar'
import { cn, fullName } from '@/lib/utils'
import Dialogo from '@/components/common/Dialogo'

const campo = 'w-full px-3 py-2 text-sm bg-background border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'
const NIVELES = [{ valor: 1, nombre: 'Baja' }, { valor: 2, nombre: 'Media' }, { valor: 3, nombre: 'Alta' }] as const
const ESTADOS: { valor: Riesgo['estado']; nombre: string }[] = [
  { valor: 'abierto', nombre: 'Abierto' }, { valor: 'mitigado', nombre: 'Mitigado' },
  { valor: 'ocurrido', nombre: 'Ocurrió' }, { valor: 'cerrado', nombre: 'Cerrado' },
]

/** Nivel = probabilidad × impacto (1 a 9): alto desde 6, medio desde 3. */
function nivel(n: number) {
  if (n >= 6) return { nombre: 'Alto', clase: 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300' }
  if (n >= 3) return { nombre: 'Medio', clase: 'bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-200' }
  return { nombre: 'Bajo', clase: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300' }
}

/** Riesgos del proyecto: los abiertos primero, del más alto al más bajo. */
export default function RiesgosPanel({ proyectoId, puedeEditar }: { proyectoId: string; puedeEditar: boolean }) {
  const qc = useQueryClient()
  const queryKey = ['riesgos', proyectoId]
  const { data: riesgos = [], isLoading } = useQuery<Riesgo[]>({ queryKey, queryFn: () => getRiesgos(proyectoId) })
  const [nuevo, setNuevo] = useState(false)
  const recargar = () => qc.invalidateQueries({ queryKey })
  const ordenados = [...riesgos].sort((a, b) =>
    Number(b.estado === 'abierto') - Number(a.estado === 'abierto') || b.nivel - a.nivel)
  const abiertos = riesgos.filter(r => r.estado === 'abierto').length

  return (
    <section aria-labelledby="riesgos-titulo" className="rounded-2xl border border-border bg-card p-5">
      <header className="flex items-center justify-between gap-2 mb-3">
        <div>
          <h3 id="riesgos-titulo" className="text-base font-semibold text-foreground">Riesgos</h3>
          {riesgos.length > 0 && <p className="text-xs text-muted-foreground">{abiertos} abierto{abiertos === 1 ? '' : 's'} de {riesgos.length}</p>}
        </div>
        {puedeEditar && (
          <button type="button" onClick={() => setNuevo(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90">
            <Plus className="h-3.5 w-3.5" /> Riesgo
          </button>
        )}
      </header>

      {isLoading ? <div className="h-12 bg-muted rounded-xl animate-pulse" /> : riesgos.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">Sin riesgos registrados.</p>
      ) : (
        <ul className="space-y-2">
          {ordenados.map(r => {
            const n = nivel(r.nivel)
            return (
              <li key={r.riesgo_ID} className={cn('rounded-lg border border-border/60 bg-background px-3 py-2.5', r.estado !== 'abierto' && 'opacity-80')}>
                <div className="flex flex-wrap items-start gap-2">
                  <span className={cn('rounded-md px-2 py-0.5 text-xs font-semibold whitespace-nowrap', n.clase)}>Nivel {n.nombre.toLowerCase()} · {r.nivel}/9</span>
                  <p className="flex-1 min-w-40 text-sm text-foreground">{r.descripcion}</p>
                  {puedeEditar ? (
                    <select aria-label={`Estado del riesgo ${r.descripcion}`} value={r.estado}
                      onChange={async e => {
                        try {
                          await actualizarRiesgo(r.riesgo_ID, { estado: e.target.value as Riesgo['estado'] })
                          await recargar()
                        } catch (err) {
                          toast.error(mensajeDeError(err, 'No se pudo cambiar el riesgo.'))
                        }
                      }}
                      className="px-2 py-1 text-xs bg-background border border-input rounded-lg text-foreground">
                      {ESTADOS.map(s => <option key={s.valor} value={s.valor}>{s.nombre}</option>)}
                    </select>
                  ) : <span className="text-xs text-muted-foreground">{r.estado_display}</span>}
                  {puedeEditar && (
                    <button type="button" aria-label={`Borrar el riesgo ${r.descripcion}`}
                      onClick={async () => {
                        if (!(await confirmar({ titulo: '¿Borrar el riesgo?', mensaje: 'Si ya no aplica, puede marcarlo como cerrado.', accion: 'Borrar' }))) return
                        try {
                          await borrarRiesgo(r.riesgo_ID)
                          await recargar()
                        } catch (err) {
                          toast.error(mensajeDeError(err, 'No se pudo borrar el riesgo.'))
                        }
                      }}
                      className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Probabilidad {r.probabilidad_display.toLowerCase()} · impacto {r.impacto_display.toLowerCase()}
                  {r.responsable_info && <> · a cargo de {fullName(r.responsable_info)}</>}
                </p>
                {r.mitigacion && <p className="mt-1 text-xs text-foreground"><span className="font-semibold">Mitigación:</span> {r.mitigacion}</p>}
              </li>
            )
          })}
        </ul>
      )}

      {nuevo && <NuevoRiesgo proyectoId={proyectoId} onCerrar={() => setNuevo(false)} onCreado={recargar} />}
    </section>
  )
}

function NuevoRiesgo({ proyectoId, onCerrar, onCreado }: { proyectoId: string; onCerrar: () => void; onCreado: () => Promise<unknown> }) {
  const { data: usuarios = [] } = useQuery<User[]>({ queryKey: ['users'], queryFn: getUsers })
  const [descripcion, setDescripcion] = useState('')
  const [probabilidad, setProbabilidad] = useState<1 | 2 | 3>(2)
  const [impacto, setImpacto] = useState<1 | 2 | 3>(2)
  const [mitigacion, setMitigacion] = useState('')
  const [responsable, setResponsable] = useState('')
  const [guardando, setGuardando] = useState(false)

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!descripcion.trim()) return
    setGuardando(true)
    try {
      await crearRiesgo({
        proyecto: proyectoId, descripcion: descripcion.trim(), probabilidad, impacto,
        mitigacion: mitigacion.trim(), responsable: responsable || null,
      })
      await onCreado()
      toast.success('Riesgo registrado')
      onCerrar()
    } catch (err) {
      toast.error(mensajeDeError(err, 'No se pudo registrar el riesgo'))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialogo titulo="Nuevo riesgo" onCerrar={onCerrar}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-bold text-foreground">Nuevo riesgo</h2>
          <button type="button" aria-label="Cerrar" onClick={onCerrar} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground"><X size={15} /></button>
        </div>
        <form onSubmit={guardar} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="riesgo-descripcion" className="text-xs font-semibold text-muted-foreground">Qué puede pasar *</label>
            <input id="riesgo-descripcion" required maxLength={255} value={descripcion} onChange={e => setDescripcion(e.target.value)}
              placeholder="Lluvias que atrasen el colado" className={campo} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="riesgo-probabilidad" className="text-xs font-semibold text-muted-foreground">Probabilidad</label>
              <select id="riesgo-probabilidad" value={probabilidad} onChange={e => setProbabilidad(Number(e.target.value) as 1 | 2 | 3)} className={campo}>
                {NIVELES.map(n => <option key={n.valor} value={n.valor}>{n.nombre}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="riesgo-impacto" className="text-xs font-semibold text-muted-foreground">Impacto</label>
              <select id="riesgo-impacto" value={impacto} onChange={e => setImpacto(Number(e.target.value) as 1 | 2 | 3)} className={campo}>
                {NIVELES.map(n => <option key={n.valor} value={n.valor}>{n.nombre}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="riesgo-mitigacion" className="text-xs font-semibold text-muted-foreground">Cómo se mitiga</label>
            <textarea id="riesgo-mitigacion" maxLength={1000} rows={3} value={mitigacion} onChange={e => setMitigacion(e.target.value)} className={cn(campo, 'resize-none')} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="riesgo-responsable" className="text-xs font-semibold text-muted-foreground">A cargo de</label>
            <select id="riesgo-responsable" value={responsable} onChange={e => setResponsable(e.target.value)} className={campo}>
              <option value="">Nadie en particular</option>
              {usuarios.map(u => <option key={u.user_ID} value={u.user_ID}>{fullName(u)}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onCerrar} className="px-4 py-2 text-sm text-muted-foreground hover:bg-accent rounded-xl">Cancelar</button>
            <button type="submit" disabled={guardando || !descripcion.trim()}
              className="px-4 py-2 text-sm font-semibold bg-ocean-500 hover:bg-ocean-600 text-white rounded-xl disabled:opacity-60">
              {guardando ? 'Guardando...' : 'Registrar riesgo'}
            </button>
          </div>
        </form>
      </motion.div>
    </Dialogo>
  )
}
