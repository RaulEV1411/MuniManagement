import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Lock, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  actualizarItemChecklist, asignarRecurso, borrarComentarioTarea, borrarItemChecklist, crearComentarioTarea,
  crearItemChecklist, getComentariosTarea, getRecursos, patchTask, quitarRecurso,
} from '@/lib/api'
import type { Task } from '@/types'
import { formatDate, formatearFechaHora } from '@/lib/utils'
import { mensajeDeError } from '@/lib/errores'
import { useMoneda } from '@/hooks/useMarca'
import Dialogo from '@/components/common/Dialogo'
import Documentos from '@/components/documentos/Documentos'
import { datosConValor, useCampos } from '@/lib/camposPersonalizados'

const campo = 'px-2.5 py-1.5 text-sm bg-background border border-input rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60'
const titulo = 'text-xs font-bold text-foreground uppercase tracking-wider'

function Seccion({ id, nombre, children }: { id: string; nombre: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="space-y-2">
      <h3 id={id} className={titulo}>{nombre}</h3>
      {children}
    </section>
  )
}

/** Todo de una tarea: avance, presupuesto, dependencias, lista de verificación, recursos, documentos y comentarios. */
export default function DetalleTarea({ task, projectId, gestiona, puedeSubir, moderaComentarios, usuarioId, cerrado, onCerrar }: {
  task: Task
  projectId: string
  gestiona: boolean
  puedeSubir: boolean
  moderaComentarios: boolean
  usuarioId: string
  cerrado: boolean
  onCerrar: () => void
}) {
  const qc = useQueryClient()
  const { formatear } = useMoneda()
  const trabaja = task.asignado_a?.user_ID === usuarioId || !!task.colaboradores?.some(c => c.user_ID === usuarioId)
  const actualiza = !cerrado && (gestiona || trabaja)
  const { data: campos = [] } = useCampos()
  const adicionales = datosConValor(campos.filter(c => c.aplica_a === 'tarea'), task.campos_extra)
  const [avance, setAvance] = useState(task.avance ?? 0)
  const [horas, setHoras] = useState(task.horas_reales ?? '')
  const [nuevoPaso, setNuevoPaso] = useState('')
  const [comentario, setComentario] = useState('')
  const [recurso, setRecurso] = useState('')
  const [cantidad, setCantidad] = useState('1')
  const { data: comentarios = [] } = useQuery({ queryKey: ['comentarios-tarea', task.tareas_ID], queryFn: () => getComentariosTarea(task.tareas_ID) })
  const { data: catalogo = [] } = useQuery({ queryKey: ['recursos'], queryFn: getRecursos, enabled: gestiona && !cerrado })
  const recargar = () => qc.invalidateQueries({ queryKey: ['tasks', projectId] })
  const intentar = async (accion: () => Promise<unknown>, error: string) => {
    try {
      await accion()
      await recargar()
    } catch (err) {
      toast.error(mensajeDeError(err, error))
    }
  }
  const checklist = task.checklist ?? []
  const hechos = checklist.filter(i => i.hecho).length

  return (
    <Dialogo titulo={`Tarea: ${task.name}`} onCerrar={onCerrar} fondo="bg-black/50" cerrarAlTocarFondo>
      <div className="w-full max-w-2xl rounded-2xl bg-card shadow-2xl flex flex-col max-h-[calc(100vh-2rem)]">
        <div className="px-6 pt-5 pb-3 border-b border-border flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-foreground">{task.name}</h2>
            <p className="text-xs text-muted-foreground">
              {task.estado_ID?.name} · {formatDate(task.fecha_inicio)} → {formatDate(task.fecha_entrega)}
              {task.asignado_a && <> · responde {task.asignado_a.first_name} {task.asignado_a.last_name}</>}
              {!!task.colaboradores?.length && <> · colaboran {task.colaboradores.map(c => c.first_name).join(', ')}</>}
            </p>
          </div>
          <button type="button" aria-label="Cerrar" onClick={onCerrar} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
        </div>
        <div className="px-6 py-4 overflow-y-auto space-y-5">
          {task.descripcion && <p className="text-sm text-foreground whitespace-pre-line">{task.descripcion}</p>}
          {!!task.bloqueada_por?.length && (
            <p role="status" className="flex items-start gap-2 text-sm rounded-xl border border-sunset-200 bg-sunset-50 text-sunset-900 dark:bg-sunset-500/10 dark:border-sunset-500/30 dark:text-sunset-100 px-3 py-2">
              <Lock size={14} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
              <span>Depende de: {task.bloqueada_por.map(b => `${b.name} (${b.estado_ID?.name})`).join(', ')}.{task.bloqueada ? ' No se puede terminar hasta que terminen.' : ''}</span>
            </p>
          )}

          <Seccion id="tarea-avance" nombre="Avance y horas">
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex-1 min-w-48 space-y-1 text-xs font-semibold text-muted-foreground">
                Avance: {avance} %
                <input type="range" min={0} max={100} step={5} value={avance} disabled={!actualiza} onChange={e => setAvance(Number(e.target.value))} className="w-full accent-ocean-500" />
              </label>
              <label className="space-y-1 text-xs font-semibold text-muted-foreground">
                Horas reales{task.horas_estimadas ? ` (de ${task.horas_estimadas} estimadas)` : ''}
                <input type="number" min={0} step={0.5} value={horas} disabled={!actualiza} onChange={e => setHoras(e.target.value)} className={`${campo} w-28 block`} />
              </label>
              {actualiza && (
                <button type="button" onClick={() => intentar(async () => {
                  await patchTask(task.tareas_ID, { avance, horas_reales: horas === '' ? null : horas })
                  toast.success('Avance guardado')
                }, 'No se pudo guardar el avance.')} className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-ocean-500 hover:bg-ocean-600 text-white">
                  Guardar
                </button>
              )}
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-xs text-muted-foreground">Presupuesto planificado</dt><dd className="font-semibold text-foreground">{formatear(task.costo ?? 0)}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Ejecutado</dt><dd className="font-semibold text-foreground">{formatear(task.costo_ejecutado ?? 0)}</dd></div>
            </dl>
            {!!task.etiquetas?.length && (
              <ul className="flex flex-wrap gap-1.5" aria-label="Etiquetas">
                {task.etiquetas.map(e => <li key={e} className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{e}</li>)}
              </ul>
            )}
            {adicionales.length > 0 && (
              <dl aria-label="Datos adicionales" className="grid grid-cols-2 gap-3 text-sm">
                {adicionales.map(({ campo, texto }) => (
                  <div key={campo.campo_ID}><dt className="text-xs text-muted-foreground">{campo.nombre}</dt><dd className="font-semibold text-foreground break-words">{texto}</dd></div>
                ))}
              </dl>
            )}
          </Seccion>

          <Seccion id="tarea-lista" nombre={`Lista de verificación${checklist.length ? ` (${hechos}/${checklist.length})` : ''}`}>
            {checklist.length === 0 && <p className="text-xs text-muted-foreground">Sin pasos.</p>}
            <ul className="space-y-1">
              {checklist.map(i => (
                <li key={i.item_ID} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={i.hecho} disabled={!actualiza} aria-label={i.texto}
                    onChange={e => intentar(() => actualizarItemChecklist(i.item_ID, { hecho: e.target.checked }), 'No se pudo marcar el paso.')} />
                  <span className={i.hecho ? 'line-through text-muted-foreground' : 'text-foreground'}>{i.texto}</span>
                  {i.hecho && i.hecho_por_nombre && <span className="text-[11px] text-muted-foreground">· {i.hecho_por_nombre}</span>}
                  {gestiona && !cerrado && (
                    <button type="button" aria-label={`Quitar el paso ${i.texto}`} onClick={() => intentar(() => borrarItemChecklist(i.item_ID), 'No se pudo quitar el paso.')}
                      className="ml-auto p-1 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 size={12} /></button>
                  )}
                </li>
              ))}
            </ul>
            {gestiona && !cerrado && (
              <form className="flex gap-2" onSubmit={e => {
                e.preventDefault()
                if (!nuevoPaso.trim()) return
                intentar(async () => { await crearItemChecklist(task.tareas_ID, nuevoPaso.trim()); setNuevoPaso('') }, 'No se pudo agregar el paso.')
              }}>
                <input aria-label="Paso nuevo" value={nuevoPaso} maxLength={200} onChange={e => setNuevoPaso(e.target.value)} placeholder="Agregar un paso…" className={`${campo} flex-1`} />
                <button type="submit" className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-border hover:bg-muted">Agregar</button>
              </form>
            )}
          </Seccion>

          <Seccion id="tarea-recursos" nombre="Recursos">
            {(task.recursos ?? []).length === 0 && <p className="text-xs text-muted-foreground">Sin recursos asignados.</p>}
            <ul className="space-y-1">
              {(task.recursos ?? []).map(a => (
                <li key={a.asignacion_ID} className="flex items-center gap-2 text-sm">
                  <span className="font-medium text-foreground">{a.recurso_info.nombre}</span>
                  <span className="text-xs text-muted-foreground">
                    {a.recurso_info.tipo_display}{a.recurso_info.codigo ? ` · ${a.recurso_info.codigo}` : ''} · {Number(a.cantidad)}
                    {(a.desde || a.hasta) && ` · ${formatDate(a.desde)} → ${formatDate(a.hasta)}`}
                  </span>
                  {gestiona && !cerrado && (
                    <button type="button" aria-label={`Quitar ${a.recurso_info.nombre}`} onClick={() => intentar(() => quitarRecurso(a.asignacion_ID), 'No se pudo quitar el recurso.')}
                      className="ml-auto p-1 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 size={12} /></button>
                  )}
                </li>
              ))}
            </ul>
            {gestiona && !cerrado && (
              <form className="flex flex-wrap gap-2" onSubmit={e => {
                e.preventDefault()
                if (!recurso) return
                intentar(async () => {
                  const r = await asignarRecurso({ tarea: task.tareas_ID, recurso, cantidad })
                  if (r.cruces?.length) toast.warning(`Ojo: ese recurso también está en ${r.cruces.join(', ')} en esas fechas.`)
                  else toast.success('Recurso asignado')
                  setRecurso('')
                }, 'No se pudo asignar el recurso.')
              }}>
                <select aria-label="Recurso" value={recurso} onChange={e => setRecurso(e.target.value)} className={`${campo} flex-1 min-w-40`}>
                  <option value="">Elegir del catálogo…</option>
                  {catalogo.filter(c => c.activo).map(c => <option key={c.recurso_ID} value={c.recurso_ID}>{c.nombre} ({c.tipo_display})</option>)}
                </select>
                <input aria-label="Cantidad" type="number" min={0.01} step={0.01} value={cantidad} onChange={e => setCantidad(e.target.value)} className={`${campo} w-24`} />
                <button type="submit" className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-border hover:bg-muted">Asignar</button>
              </form>
            )}
          </Seccion>

          <Seccion id="tarea-documentos" nombre="Documentos">
            <Documentos proyectoId={projectId} tareaId={task.tareas_ID} puedeSubir={puedeSubir || trabaja} usuarioId={usuarioId} />
          </Seccion>

          <Seccion id="tarea-comentarios" nombre="Comentarios">
            {comentarios.length === 0 && <p className="text-xs text-muted-foreground">Sin comentarios.</p>}
            <ul className="space-y-2">
              {comentarios.map(c => (
                <li key={c.comentario_ID} className="text-sm">
                  <p className="text-foreground whitespace-pre-line">{c.texto}</p>
                  <p className="text-[11px] text-muted-foreground flex items-center gap-2">
                    {c.autor ? `${c.autor.first_name} ${c.autor.last_name}` : 'Alguien'} · {formatearFechaHora(c.creado_en)}
                    {(c.autor?.user_ID === usuarioId || moderaComentarios) && (
                      <button type="button" className="underline" onClick={async () => {
                        try {
                          await borrarComentarioTarea(c.comentario_ID)
                          await qc.invalidateQueries({ queryKey: ['comentarios-tarea', task.tareas_ID] })
                          await recargar()
                        } catch (err) {
                          toast.error(mensajeDeError(err, 'No se pudo borrar el comentario.'))
                        }
                      }}>Borrar</button>
                    )}
                  </p>
                </li>
              ))}
            </ul>
            <form className="flex gap-2" onSubmit={async e => {
              e.preventDefault()
              if (!comentario.trim()) return
              try {
                await crearComentarioTarea(task.tareas_ID, comentario.trim())
                setComentario('')
                await qc.invalidateQueries({ queryKey: ['comentarios-tarea', task.tareas_ID] })
                await recargar()
              } catch (err) {
                toast.error(mensajeDeError(err, 'No se pudo comentar.'))
              }
            }}>
              <input aria-label="Comentario nuevo" value={comentario} maxLength={1000} onChange={e => setComentario(e.target.value)} placeholder="Escribir un comentario…" className={`${campo} flex-1`} />
              <button type="submit" className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-border hover:bg-muted">Comentar</button>
            </form>
          </Seccion>
        </div>
      </div>
    </Dialogo>
  )
}
