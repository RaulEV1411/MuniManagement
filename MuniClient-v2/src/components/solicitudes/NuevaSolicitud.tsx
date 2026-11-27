import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { crearSolicitud, getRolesProyecto, getTiposSolicitud, getUsers } from '@/lib/api'
import type { EfectoSolicitud, Project, Task, User } from '@/types'
import { formatDate } from '@/lib/utils'
import { mensajeDeError } from '@/lib/errores'
import Dialogo from '@/components/common/Dialogo'

const cls = 'w-full px-3 py-2 text-sm bg-background border border-input rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-ring'
const etiqueta = 'text-xs font-semibold text-muted-foreground'

/** Pedir un cambio: el proyecto sigue mientras se decide, y al aprobarse se aplica solo. */
export default function NuevaSolicitud({ project, tasks, efectoInicial, onCerrar, onListo }: {
  project: Project
  tasks: Task[]
  efectoInicial?: EfectoSolicitud
  onCerrar: () => void
  onListo: () => void
}) {
  const { data: tipos = [] } = useQuery({ queryKey: ['tipos-solicitud'], queryFn: getTiposSolicitud, staleTime: 300_000 })
  const activos = tipos.filter(t => t.activo)
  const [tipoElegido, setTipo] = useState<number | null>(null)
  const tipo = activos.find(t => t.tipo_ID === tipoElegido) ?? activos.find(t => t.efecto === efectoInicial) ?? activos[0]
  const efecto = tipo?.efecto
  const { data: personas = [] } = useQuery<User[]>({ queryKey: ['users'], queryFn: getUsers, enabled: efecto === 'personal' || efecto === 'responsable' })
  const { data: roles = [] } = useQuery({ queryKey: ['roles-proyecto'], queryFn: getRolesProyecto, enabled: efecto === 'personal' })
  const [tarea, setTarea] = useState('')
  const [fecha, setFecha] = useState('')
  const [monto, setMonto] = useState('')
  const [persona, setPersona] = useState('')
  const [rol, setRol] = useState('')
  const [hasta, setHasta] = useState('')
  const [justificacion, setJustificacion] = useState('')
  const [enviando, setEnviando] = useState(false)
  const conTarea = efecto === 'plazo' || efecto === 'aumento' || efecto === 'rebajo'
  const entregaActual = (tasks.find(t => t.tareas_ID === tarea)?.fecha_entrega) ?? project.fecha_entrega

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tipo) return
    setEnviando(true)
    try {
      await crearSolicitud({
        proyecto: project.proyect_ID, tipo: tipo.tipo_ID, justificacion: justificacion.trim(),
        ...(conTarea && tarea && { tarea }),
        ...(efecto === 'plazo' && { nueva_fecha: fecha }),
        ...((efecto === 'aumento' || efecto === 'rebajo') && { monto: Number(monto) }),
        ...((efecto === 'personal' || efecto === 'responsable') && { persona }),
        ...(efecto === 'personal' && { rol_proyecto: rol, hasta: hasta || null }),
      })
      toast.success('Solicitud enviada. El proyecto sigue mientras se decide.')
      onListo()
    } catch (err) {
      toast.error(mensajeDeError(err, 'No se pudo enviar la solicitud.'))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Dialogo titulo="Nueva solicitud" onCerrar={onCerrar} fondo="bg-black/50">
      <form onSubmit={enviar} className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-2xl space-y-3">
        <div className="flex items-start justify-between">
          <h2 className="text-lg font-semibold text-foreground">Nueva solicitud · {project.name}</h2>
          <button type="button" aria-label="Cerrar" onClick={onCerrar} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="sol-tipo" className={etiqueta}>Qué pide</label>
          <select id="sol-tipo" value={tipo?.tipo_ID ?? ''} onChange={e => setTipo(Number(e.target.value))} className={cls}>
            {activos.map(t => <option key={t.tipo_ID} value={t.tipo_ID}>{t.nombre}</option>)}
          </select>
          {tipo?.descripcion && <p className="text-xs text-muted-foreground">{tipo.descripcion}</p>}
        </div>
        {conTarea && tasks.length > 0 && (
          <div className="space-y-1.5">
            <label htmlFor="sol-tarea" className={etiqueta}>Para</label>
            <select id="sol-tarea" value={tarea} onChange={e => setTarea(e.target.value)} className={cls}>
              <option value="">Todo el proyecto</option>
              {tasks.map(t => <option key={t.tareas_ID} value={t.tareas_ID}>Tarea: {t.name}</option>)}
            </select>
          </div>
        )}
        {efecto === 'plazo' && (
          <div className="space-y-1.5">
            <label htmlFor="sol-fecha" className={etiqueta}>Nueva fecha de entrega (hoy: {formatDate(entregaActual)})</label>
            <input id="sol-fecha" type="date" required min={entregaActual} value={fecha} onChange={e => setFecha(e.target.value)} className={cls} />
          </div>
        )}
        {(efecto === 'aumento' || efecto === 'rebajo') && (
          <div className="space-y-1.5">
            <label htmlFor="sol-monto" className={etiqueta}>Monto</label>
            <input id="sol-monto" type="number" required min={1} step={1} value={monto} onChange={e => setMonto(e.target.value)} className={cls} />
          </div>
        )}
        {(efecto === 'personal' || efecto === 'responsable') && (
          <div className="space-y-1.5">
            <label htmlFor="sol-persona" className={etiqueta}>{efecto === 'personal' ? 'Persona que se suma' : 'Responsable nuevo'}</label>
            <select id="sol-persona" required value={persona} onChange={e => setPersona(e.target.value)} className={cls}>
              <option value="">Elegir…</option>
              {personas.filter(u => u.user_ID !== project.user_ID?.user_ID).map(u => (
                <option key={u.user_ID} value={u.user_ID}>{u.first_name} {u.last_name}</option>
              ))}
            </select>
          </div>
        )}
        {efecto === 'personal' && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="sol-rol" className={etiqueta}>Rol en el proyecto</label>
              <select id="sol-rol" required value={rol} onChange={e => setRol(e.target.value)} className={cls}>
                <option value="">Elegir…</option>
                {roles.map(r => <option key={r.rol_proyecto_ID} value={r.rol_proyecto_ID}>{r.nombre}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="sol-hasta" className={etiqueta}>Hasta (opcional)</label>
              <input id="sol-hasta" type="date" value={hasta} onChange={e => setHasta(e.target.value)} className={cls} />
            </div>
          </div>
        )}
        <div className="space-y-1.5">
          <label htmlFor="sol-justificacion" className={etiqueta}>Justificación</label>
          <textarea id="sol-justificacion" required maxLength={4000} rows={3} value={justificacion} onChange={e => setJustificacion(e.target.value)}
            placeholder="Por qué hace falta y qué pasa si no se aprueba" className={cls} />
        </div>
        <p className="text-xs text-muted-foreground">
          Quién la aprueba depende del monto o de los días que pide. Al aprobarse, el cambio se aplica solo y queda en el historial.
        </p>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCerrar} className="px-4 py-2 text-sm font-semibold rounded-xl border border-border hover:bg-muted">Volver</button>
          <button type="submit" disabled={enviando || !tipo} className="px-4 py-2 text-sm font-semibold rounded-xl bg-ocean-500 hover:bg-ocean-600 text-white disabled:opacity-60">
            {enviando ? 'Enviando…' : 'Enviar solicitud'}
          </button>
        </div>
      </form>
    </Dialogo>
  )
}
