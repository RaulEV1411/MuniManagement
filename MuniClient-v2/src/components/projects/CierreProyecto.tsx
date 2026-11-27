import { useState } from 'react'
import { FileText, Flag, X } from 'lucide-react'
import { toast } from 'sonner'
import { cerrarProyecto, reabrirProyecto } from '@/lib/api'
import type { CierreProyecto, Estado, Project } from '@/types'
import { formatDate } from '@/lib/utils'
import { mensajeDeError } from '@/lib/errores'
import { esFinal } from '@/lib/estados'
import { useMoneda } from '@/hooks/useMarca'
import Dialogo from '@/components/common/Dialogo'

const cls = 'w-full px-3 py-2 text-sm bg-background border border-input rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-ring'
const etiqueta = 'text-xs font-semibold text-muted-foreground'

function Encabezado({ titulo, onCerrar }: { titulo: string; onCerrar: () => void }) {
  return (
    <div className="flex items-start justify-between mb-3">
      <h2 className="text-lg font-semibold text-foreground">{titulo}</h2>
      <button type="button" aria-label="Cerrar" onClick={onCerrar} className="text-muted-foreground hover:text-foreground">
        <X className="h-5 w-5" />
      </button>
    </div>
  )
}

/** Terminar o cancelar un proyecto: cómo terminó, cuándo, cuánto costó, por qué y qué se aprendió. */
export function CerrarProyectoDialogo({ project, estados, inicial, pendientes, onCerrar, onListo }: {
  project: Project
  estados: Estado[]
  inicial?: string
  pendientes: number
  onCerrar: () => void
  onListo: () => void
}) {
  const finales = estados.filter(esFinal)
  const hoy = new Date().toLocaleDateString('en-CA')
  const [estado, setEstado] = useState(inicial ?? finales[0]?.estado_ID ?? '')
  const [fecha, setFecha] = useState(hoy)
  const [costo, setCosto] = useState(String(project.costo_total ?? project.costo ?? 0))
  const [motivo, setMotivo] = useState('')
  const [lecciones, setLecciones] = useState('')
  const [acta, setActa] = useState<File | null>(null)
  const [guardando, setGuardando] = useState(false)

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    const datos = new FormData()
    datos.append('estado_ID', estado)
    datos.append('fecha_fin_real', fecha)
    datos.append('costo_real', costo)
    datos.append('motivo', motivo.trim())
    datos.append('lecciones', lecciones.trim())
    if (acta) datos.append('acta', acta)
    setGuardando(true)
    try {
      await cerrarProyecto(project.proyect_ID, datos)
      toast.success('Proyecto cerrado. Queda en Finalizados.')
      onListo()
    } catch (err) {
      toast.error(mensajeDeError(err, 'No se pudo cerrar el proyecto.'))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialogo titulo="Cerrar el proyecto" onCerrar={onCerrar} fondo="bg-black/50">
      <form onSubmit={guardar} className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-2xl space-y-3">
        <Encabezado titulo={`Cerrar «${project.name}»`} onCerrar={onCerrar} />
        <p className="text-sm text-muted-foreground">
          Un proyecto cerrado no se edita: para cambiarlo hay que reabrirlo. Todo queda en el historial y en la auditoría.
        </p>
        {pendientes > 0 && (
          <p role="status" className="text-xs rounded-xl border border-sunset-200 bg-sunset-50 text-sunset-900 dark:bg-sunset-500/10 dark:border-sunset-500/30 dark:text-sunset-100 px-3 py-2">
            {pendientes === 1 ? 'Queda 1 tarea sin terminar.' : `Quedan ${pendientes} tareas sin terminar.`} Se conservan tal como están.
          </p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="cierre-estado" className={etiqueta}>Cómo terminó</label>
            <select id="cierre-estado" value={estado} onChange={e => setEstado(e.target.value)} required className={cls}>
              {finales.map(e => <option key={e.estado_ID} value={e.estado_ID}>{e.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="cierre-fecha" className={etiqueta}>Fecha real de fin</label>
            <input id="cierre-fecha" type="date" value={fecha} max={hoy} onChange={e => setFecha(e.target.value)} required className={cls} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="cierre-costo" className={etiqueta}>Costo real</label>
            <input id="cierre-costo" type="number" min={0} step={1} value={costo} onChange={e => setCosto(e.target.value)} required className={cls} />
          </div>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="cierre-motivo" className={etiqueta}>Resumen del cierre o motivo</label>
          <textarea id="cierre-motivo" value={motivo} onChange={e => setMotivo(e.target.value)} required maxLength={2000} rows={3}
            placeholder="Qué se entregó, o por qué se canceló" className={cls} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="cierre-lecciones" className={etiqueta}>Lecciones aprendidas (opcional)</label>
          <textarea id="cierre-lecciones" value={lecciones} onChange={e => setLecciones(e.target.value)} maxLength={4000} rows={2}
            placeholder="Qué conviene repetir o evitar en el próximo proyecto" className={cls} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="cierre-acta" className={etiqueta}>Acta de cierre (opcional, PDF o imagen, hasta 10 MB)</label>
          <input id="cierre-acta" type="file" accept="application/pdf,image/jpeg,image/png,image/webp"
            onChange={e => setActa(e.target.files?.[0] ?? null)} className="block w-full text-xs text-muted-foreground file:mr-3 file:px-3 file:py-1.5 file:rounded-xl file:border-0 file:bg-muted file:text-foreground file:font-semibold" />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onCerrar} className="px-4 py-2 text-sm font-semibold rounded-xl border border-border hover:bg-muted">Volver</button>
          <button type="submit" disabled={guardando || !estado} className="px-4 py-2 text-sm font-semibold rounded-xl bg-ocean-500 hover:bg-ocean-600 text-white disabled:opacity-60">
            {guardando ? 'Cerrando…' : 'Cerrar proyecto'}
          </button>
        </div>
      </form>
    </Dialogo>
  )
}

/** Volver a abrir un proyecto cerrado: a qué estado vuelve y por qué. */
export function ReabrirProyectoDialogo({ project, estados, onCerrar, onListo }: {
  project: Project
  estados: Estado[]
  onCerrar: () => void
  onListo: () => void
}) {
  const abiertos = estados.filter(e => !esFinal(e))
  const [estado, setEstado] = useState(abiertos.find(e => e.name === 'En progreso')?.estado_ID ?? abiertos[0]?.estado_ID ?? '')
  const [motivo, setMotivo] = useState('')
  const [guardando, setGuardando] = useState(false)

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    setGuardando(true)
    try {
      await reabrirProyecto(project.proyect_ID, { estado_ID: estado, motivo: motivo.trim() })
      toast.success('Proyecto reabierto.')
      onListo()
    } catch (err) {
      toast.error(mensajeDeError(err, 'No se pudo reabrir el proyecto.'))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialogo titulo="Reabrir el proyecto" onCerrar={onCerrar} fondo="bg-black/50">
      <form onSubmit={guardar} className="w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl space-y-3">
        <Encabezado titulo={`Reabrir «${project.name}»`} onCerrar={onCerrar} />
        <p className="text-sm text-muted-foreground">El cierre anterior se conserva, con quién lo reabrió y por qué.</p>
        <div className="space-y-1.5">
          <label htmlFor="reabrir-estado" className={etiqueta}>Vuelve a</label>
          <select id="reabrir-estado" value={estado} onChange={e => setEstado(e.target.value)} required className={cls}>
            {abiertos.map(e => <option key={e.estado_ID} value={e.estado_ID}>{e.name}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="reabrir-motivo" className={etiqueta}>Motivo</label>
          <textarea id="reabrir-motivo" value={motivo} onChange={e => setMotivo(e.target.value)} required maxLength={2000} rows={3} className={cls} />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onCerrar} className="px-4 py-2 text-sm font-semibold rounded-xl border border-border hover:bg-muted">Volver</button>
          <button type="submit" disabled={guardando || !estado} className="px-4 py-2 text-sm font-semibold rounded-xl bg-ocean-500 hover:bg-ocean-600 text-white disabled:opacity-60">
            {guardando ? 'Reabriendo…' : 'Reabrir'}
          </button>
        </div>
      </form>
    </Dialogo>
  )
}

/** Lo que quedó del cierre: se muestra en Información mientras el proyecto siga cerrado. */
export function TarjetaDeCierre({ cierre, costoPrevisto }: { cierre: CierreProyecto; costoPrevisto: number }) {
  const { formatear } = useMoneda()
  const diferencia = cierre.costo_real - costoPrevisto
  return (
    <section aria-labelledby="cierre-titulo" className="bg-card border border-border rounded-2xl p-5 space-y-3">
      <h2 id="cierre-titulo" className="flex items-center gap-2 text-sm font-bold text-foreground">
        <Flag size={15} aria-hidden="true" /> Cierre del proyecto
      </h2>
      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <div><dt className={etiqueta}>Terminó como</dt><dd className="font-semibold text-foreground">{cierre.estado_nombre}</dd></div>
        <div><dt className={etiqueta}>Fecha real de fin</dt><dd className="text-foreground">{formatDate(cierre.fecha_fin_real)}</dd></div>
        <div><dt className={etiqueta}>Costo real</dt><dd className="text-foreground">{formatear(cierre.costo_real)}</dd></div>
        <div>
          <dt className={etiqueta}>Frente a lo previsto</dt>
          <dd className="text-foreground">{diferencia === 0 ? 'Igual' : `${diferencia > 0 ? '+' : '−'}${formatear(Math.abs(diferencia))}`}</dd>
        </div>
      </dl>
      <div>
        <p className={etiqueta}>Resumen o motivo</p>
        <p className="text-sm text-foreground whitespace-pre-line">{cierre.motivo}</p>
      </div>
      {cierre.lecciones && (
        <div>
          <p className={etiqueta}>Lecciones aprendidas</p>
          <p className="text-sm text-foreground whitespace-pre-line">{cierre.lecciones}</p>
        </div>
      )}
      {cierre.documentos.length > 0 && (
        <ul className="space-y-1">
          {cierre.documentos.map(d => (
            <li key={d.documento_ID}>
              <a href={d.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ocean-500 dark:text-ocean-200 hover:underline">
                <FileText size={14} aria-hidden="true" /> {d.tipo === 'acta' ? 'Acta de cierre' : d.nombre}
              </a>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">
        Cerrado{cierre.cerrado_por_nombre ? ` por ${cierre.cerrado_por_nombre}` : ''} el {new Date(cierre.cerrado_en).toLocaleDateString('es-CR')}.
      </p>
    </section>
  )
}
