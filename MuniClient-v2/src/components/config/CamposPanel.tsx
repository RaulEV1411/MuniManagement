import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { actualizarCampo, borrarCampo, crearCampo, getTipos } from '@/lib/api'
import type { AplicaA, CampoPersonalizado, Tipo, TipoDeDato } from '@/types'
import { mensajeDeError } from '@/lib/errores'
import { usePermiso } from '@/hooks/usePermiso'
import { confirmar } from '@/lib/confirmar'
import { NOMBRE_DE_TIPO_DE_DATO, useCampos } from '@/lib/camposPersonalizados'

const estilo = 'w-full px-3 py-2 text-sm bg-background border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'
const VACIO = { nombre: '', aplica_a: 'proyecto' as AplicaA, tipo_dato: 'texto' as TipoDeDato, opciones: '', obligatorio: false, ayuda: '', tipos: [] as string[] }

/** Configuración › Campos: datos que la institución pide en los proyectos o en las tareas, sin tocar el sistema. */
export default function CamposPanel() {
  const qc = useQueryClient()
  const edita = usePermiso('catalogos.gestionar')
  const { data: campos = [], isLoading } = useCampos()
  const { data: tipos = [] } = useQuery<Tipo[]>({ queryKey: ['tipos'], queryFn: getTipos })
  const [form, setForm] = useState(VACIO)
  const [editando, setEditando] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const nombreDeTipo = (id: string) => tipos.find(t => t.tipos_ID === id)?.name ?? 'Tipo borrado'
  // Sin cancelar, si la lista todavía estaba cargando, la recarga se engancha a esa petición (que no trae lo nuevo).
  const recargar = async () => {
    await qc.cancelQueries({ queryKey: ['campos'] })
    await qc.invalidateQueries({ queryKey: ['campos'] })
  }

  const intentar = async (accion: () => Promise<unknown>, error: string) => {
    try {
      await accion()
      await recargar()
    } catch (err) {
      toast.error(mensajeDeError(err, error))
    }
  }

  const empezarEdicion = (c: CampoPersonalizado) => {
    setEditando(c.campo_ID)
    setForm({ nombre: c.nombre, aplica_a: c.aplica_a, tipo_dato: c.tipo_dato, opciones: c.opciones.join('\n'), obligatorio: c.obligatorio, ayuda: c.ayuda, tipos: c.tipos })
  }
  const cancelar = () => { setEditando(null); setForm(VACIO) }

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    const datos = {
      nombre: form.nombre.trim(), aplica_a: form.aplica_a, tipo_dato: form.tipo_dato, obligatorio: form.obligatorio,
      ayuda: form.ayuda.trim(), tipos: form.tipos,
      opciones: form.tipo_dato === 'lista' ? form.opciones.split('\n').map(o => o.trim()).filter(Boolean) : [],
    }
    setGuardando(true)
    try {
      if (editando) await actualizarCampo(editando, datos)
      else await crearCampo(datos)
      toast.success(editando ? 'Campo guardado' : 'Campo creado')
      cancelar()
      await recargar()
    } catch (err) {
      toast.error(mensajeDeError(err, 'No se pudo guardar el campo.'))
    } finally {
      setGuardando(false)
    }
  }

  const grupos: { aplica: AplicaA; titulo: string }[] = [{ aplica: 'proyecto', titulo: 'En los proyectos' }, { aplica: 'tarea', titulo: 'En las tareas' }]

  return (
    <div className="max-w-3xl space-y-4">
      <p className="text-sm text-muted-foreground">
        Datos que la institución pide además de los de siempre. Un campo sin tipos aparece en todos los proyectos; las tareas usan el tipo de su proyecto.
        Si un campo ya tiene datos, no se borra: desactívelo para que no se pida más. {!edita && 'Su rol no permite editar el catálogo.'}
      </p>

      {edita && (
        <form onSubmit={guardar} aria-label={editando ? 'Editar campo' : 'Nuevo campo'} className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">{editando ? 'Editar campo' : 'Nuevo campo'}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5 sm:col-span-3">
              <label htmlFor="campo-nombre" className="text-xs font-semibold text-muted-foreground">Nombre del campo</label>
              <input id="campo-nombre" required maxLength={60} value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                placeholder="N.º de contratación, cuadrilla, zona…" className={estilo} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="campo-aplica" className="text-xs font-semibold text-muted-foreground">Se pide en</label>
              <select id="campo-aplica" value={form.aplica_a} onChange={e => setForm(f => ({ ...f, aplica_a: e.target.value as AplicaA }))} className={estilo}>
                <option value="proyecto">Proyectos</option>
                <option value="tarea">Tareas</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="campo-tipo-dato" className="text-xs font-semibold text-muted-foreground">Tipo de dato</label>
              <select id="campo-tipo-dato" value={form.tipo_dato} onChange={e => setForm(f => ({ ...f, tipo_dato: e.target.value as TipoDeDato }))} className={estilo}>
                {Object.entries(NOMBRE_DE_TIPO_DE_DATO).map(([v, n]) => <option key={v} value={v}>{n}</option>)}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm text-foreground sm:pt-6">
              <input type="checkbox" checked={form.obligatorio} onChange={e => setForm(f => ({ ...f, obligatorio: e.target.checked }))} className="h-4 w-4 accent-ocean-500" />
              Obligatorio
            </label>
          </div>
          {form.tipo_dato === 'lista' && (
            <div className="space-y-1.5">
              <label htmlFor="campo-opciones" className="text-xs font-semibold text-muted-foreground">Opciones (una por línea)</label>
              <textarea id="campo-opciones" required rows={3} value={form.opciones} onChange={e => setForm(f => ({ ...f, opciones: e.target.value }))} className={estilo} />
            </div>
          )}
          <div className="space-y-1.5">
            <label htmlFor="campo-ayuda" className="text-xs font-semibold text-muted-foreground">Ayuda (opcional)</label>
            <input id="campo-ayuda" maxLength={200} value={form.ayuda} onChange={e => setForm(f => ({ ...f, ayuda: e.target.value }))}
              placeholder="Aparece debajo del campo" className={estilo} />
          </div>
          {tipos.length > 0 && (
            <fieldset>
              <legend className="text-xs font-semibold text-muted-foreground mb-1.5">Tipos de proyecto (sin marcar: todos)</legend>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                {tipos.map(t => (
                  <label key={t.tipos_ID} className="flex items-center gap-1.5 text-sm text-foreground">
                    <input type="checkbox" checked={form.tipos.includes(t.tipos_ID)} className="h-4 w-4 accent-ocean-500"
                      onChange={e => setForm(f => ({ ...f, tipos: e.target.checked ? [...f.tipos, t.tipos_ID] : f.tipos.filter(x => x !== t.tipos_ID) }))} />
                    {t.name}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          <div className="flex justify-end gap-2">
            {editando && <button type="button" onClick={cancelar} className="px-4 py-2 text-sm text-muted-foreground hover:bg-accent rounded-xl">Cancelar</button>}
            <button type="submit" disabled={guardando} className="px-4 py-2 bg-ocean-500 hover:bg-ocean-600 text-white text-xs font-semibold rounded-xl disabled:opacity-60">
              {guardando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Crear campo'}
            </button>
          </div>
        </form>
      )}

      {isLoading ? <div className="h-24 bg-muted rounded-2xl animate-pulse" /> : grupos.map(({ aplica, titulo }) => {
        const delGrupo = campos.filter(c => c.aplica_a === aplica)
        return (
          <section key={aplica} aria-label={titulo} className="space-y-2">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">{titulo}</h3>
            {delGrupo.length === 0 ? <p className="text-sm text-muted-foreground">Ninguno todavía.</p> : (
              <ul className="bg-card border border-border rounded-2xl divide-y divide-border">
                {delGrupo.map(c => (
                  <li key={c.campo_ID} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${c.activo ? 'text-foreground' : 'text-muted-foreground line-through'}`}>{c.nombre}</p>
                      <p className="text-xs text-muted-foreground">
                        {NOMBRE_DE_TIPO_DE_DATO[c.tipo_dato]}{c.tipo_dato === 'lista' && ` (${c.opciones.join(', ')})`}
                        {c.obligatorio && ' · obligatorio'} · {c.tipos.length ? c.tipos.map(nombreDeTipo).join(', ') : 'todos los tipos'}
                      </p>
                    </div>
                    <label className="flex items-center gap-1.5 text-xs text-foreground">
                      <input type="checkbox" checked={c.activo} disabled={!edita}
                        onChange={e => intentar(() => actualizarCampo(c.campo_ID, { activo: e.target.checked }), 'No se pudo cambiar el campo.')} />
                      Activo
                    </label>
                    {edita && (
                      <>
                        <button type="button" aria-label={`Editar ${c.nombre}`} onClick={() => empezarEdicion(c)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground">
                          <Pencil size={13} />
                        </button>
                        <button type="button" aria-label={`Borrar ${c.nombre}`} onClick={async () => {
                          if (!(await confirmar({ titulo: `¿Borrar «${c.nombre}»?`, mensaje: 'Si ya tiene datos cargados no se puede borrar: desactívelo.', accion: 'Borrar' }))) return
                          intentar(() => borrarCampo(c.campo_ID), 'No se pudo borrar el campo.')
                        }} className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                          <Trash2 size={13} />
                        </button>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )
      })}
    </div>
  )
}
