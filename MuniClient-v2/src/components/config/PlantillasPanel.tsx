import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Pencil, Plus, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { actualizarPlantilla, borrarPlantilla, crearPlantilla } from '@/lib/api'
import type { TareaPlantilla, Tipo } from '@/types'
import { mensajeDeError } from '@/lib/errores'
import { confirmar } from '@/lib/confirmar'
import { cn } from '@/lib/utils'
import Dialogo from '@/components/common/Dialogo'

const campo = 'w-full px-3 py-2 text-sm bg-background border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'
const dias = (n: number) => `${n} día${n === 1 ? '' : 's'}`

/** Configuración › Tipos: las tareas que se crean solas con cada proyecto de ese tipo. */
export default function PlantillasPanel({ tipos, edita }: { tipos: Tipo[]; edita: boolean }) {
  const qc = useQueryClient()
  const [tipoId, setTipoId] = useState('')
  const [editando, setEditando] = useState<TareaPlantilla | 'nueva' | null>(null)
  const tipo = tipos.find(t => t.tipos_ID === tipoId) ?? tipos[0]
  const plantillas = tipo?.plantillas ?? []
  const recargar = () => qc.invalidateQueries({ queryKey: ['tipos'] })

  if (!tipo) return null
  return (
    <section className="max-w-2xl space-y-3" aria-labelledby="plantillas-titulo">
      <div>
        <h2 id="plantillas-titulo" className="text-sm font-bold text-foreground">Tareas que trae cada tipo</h2>
        <p className="text-xs text-muted-foreground">
          Al crear un proyecto de ese tipo se crean estas tareas, con sus fechas contadas desde el inicio del proyecto (sin pasar de la entrega).
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="plantillas-tipo" className="text-xs font-semibold text-muted-foreground">Tipo</label>
        <select id="plantillas-tipo" value={tipo.tipos_ID} onChange={e => setTipoId(e.target.value)} className={cn(campo, 'w-auto')}>
          {tipos.map(t => <option key={t.tipos_ID} value={t.tipos_ID}>{t.name} ({t.plantillas?.length ?? 0})</option>)}
        </select>
        {edita && (
          <button type="button" onClick={() => setEditando('nueva')}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-ocean-500 hover:bg-ocean-600 text-white text-xs font-semibold rounded-xl">
            <Plus className="h-3.5 w-3.5" /> Agregar tarea
          </button>
        )}
      </div>
      {plantillas.length === 0 ? (
        <p className="text-sm text-muted-foreground">«{tipo.name}» todavía no trae tareas.</p>
      ) : (
        <ol className="bg-card border border-border rounded-2xl divide-y divide-border">
          {plantillas.map(p => (
            <li key={p.plantilla_ID} className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{p.nombre}</p>
                <p className="text-xs text-muted-foreground">
                  {p.dias_desde_inicio === 0 ? 'Desde el inicio' : `A los ${dias(p.dias_desde_inicio)} del inicio`} · dura {dias(p.duracion_dias)}
                  {p.pasos.length > 0 && ` · ${p.pasos.length} paso${p.pasos.length === 1 ? '' : 's'}`}
                </p>
              </div>
              {edita && (
                <>
                  <button type="button" aria-label={`Editar ${p.nombre}`} onClick={() => setEditando(p)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground">
                    <Pencil size={13} />
                  </button>
                  <button type="button" aria-label={`Quitar ${p.nombre} de la plantilla`} onClick={async () => {
                    if (!(await confirmar({ titulo: `¿Quitar «${p.nombre}» de la plantilla?`, mensaje: 'Los proyectos ya creados no cambian.', accion: 'Quitar' }))) return
                    try {
                      await borrarPlantilla(p.plantilla_ID)
                      await recargar()
                    } catch (err) {
                      toast.error(mensajeDeError(err, 'No se pudo quitar la tarea.'))
                    }
                  }} className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                    <Trash2 size={13} />
                  </button>
                </>
              )}
            </li>
          ))}
        </ol>
      )}
      {editando && (
        <PlantillaDialogo
          tipo={tipo}
          plantilla={editando === 'nueva' ? null : editando}
          orden={Math.max(0, ...plantillas.map(p => p.orden)) + 1}
          onCerrar={() => setEditando(null)}
          onGuardada={recargar}
        />
      )}
    </section>
  )
}

function PlantillaDialogo({ tipo, plantilla, orden, onCerrar, onGuardada }: {
  tipo: Tipo
  plantilla: TareaPlantilla | null
  orden: number
  onCerrar: () => void
  onGuardada: () => Promise<unknown>
}) {
  const [nombre, setNombre] = useState(plantilla?.nombre ?? '')
  const [descripcion, setDescripcion] = useState(plantilla?.descripcion ?? '')
  const [desde, setDesde] = useState(String(plantilla?.dias_desde_inicio ?? 0))
  const [duracion, setDuracion] = useState(String(plantilla?.duracion_dias ?? 1))
  const [pasos, setPasos] = useState((plantilla?.pasos ?? []).join('\n'))
  const [guardando, setGuardando] = useState(false)
  const titulo = plantilla ? `Editar «${plantilla.nombre}»` : `Nueva tarea para «${tipo.name}»`

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombre.trim()) return
    const datos = {
      nombre: nombre.trim(), descripcion: descripcion.trim(),
      dias_desde_inicio: Number(desde) || 0, duracion_dias: Math.max(1, Number(duracion) || 1),
      pasos: pasos.split('\n').map(p => p.trim()).filter(Boolean),
    }
    setGuardando(true)
    try {
      if (plantilla) await actualizarPlantilla(plantilla.plantilla_ID, datos)
      else await crearPlantilla({ ...datos, tipo: tipo.tipos_ID, orden })
      await onGuardada()
      toast.success(plantilla ? 'Tarea actualizada' : 'Tarea agregada a la plantilla')
      onCerrar()
    } catch (err) {
      toast.error(mensajeDeError(err, 'No se pudo guardar la tarea.'))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialogo titulo={titulo} onCerrar={onCerrar}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-bold text-foreground">{titulo}</h2>
          <button type="button" aria-label="Cerrar" onClick={onCerrar} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground"><X size={15} /></button>
        </div>
        <form onSubmit={guardar} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="plantilla-nombre" className="text-xs font-semibold text-muted-foreground">Nombre de la tarea *</label>
            <input id="plantilla-nombre" required maxLength={50} value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Demarcar el área" className={campo} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="plantilla-descripcion" className="text-xs font-semibold text-muted-foreground">Descripción</label>
            <input id="plantilla-descripcion" maxLength={255} value={descripcion} onChange={e => setDescripcion(e.target.value)} className={campo} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="plantilla-desde" className="text-xs font-semibold text-muted-foreground">Empieza a los … días del inicio</label>
              <input id="plantilla-desde" type="number" min={0} max={3650} value={desde} onChange={e => setDesde(e.target.value)} className={campo} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="plantilla-duracion" className="text-xs font-semibold text-muted-foreground">Dura (días)</label>
              <input id="plantilla-duracion" type="number" min={1} max={3650} value={duracion} onChange={e => setDuracion(e.target.value)} className={campo} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="plantilla-pasos" className="text-xs font-semibold text-muted-foreground">Pasos de la lista de verificación (uno por línea)</label>
            <textarea id="plantilla-pasos" rows={4} value={pasos} onChange={e => setPasos(e.target.value)} className={cn(campo, 'resize-none')} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onCerrar} className="px-4 py-2 text-sm text-muted-foreground hover:bg-accent rounded-xl">Cancelar</button>
            <button type="submit" disabled={guardando || !nombre.trim()}
              className="px-4 py-2 text-sm font-semibold bg-ocean-500 hover:bg-ocean-600 text-white rounded-xl disabled:opacity-60">
              {guardando ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </motion.div>
    </Dialogo>
  )
}
