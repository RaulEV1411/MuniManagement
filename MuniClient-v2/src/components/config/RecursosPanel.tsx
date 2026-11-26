import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { actualizarRecurso, borrarRecurso, crearRecurso, getRecursos } from '@/lib/api'
import type { TipoRecurso } from '@/types'
import { mensajeDeError } from '@/lib/errores'
import { usePermiso } from '@/hooks/usePermiso'
import { confirmar } from '@/lib/confirmar'

const TIPOS: { clave: TipoRecurso; nombre: string }[] = [
  { clave: 'vehiculo', nombre: 'Vehículo' }, { clave: 'maquinaria', nombre: 'Maquinaria' }, { clave: 'equipo', nombre: 'Equipo' },
  { clave: 'material', nombre: 'Material' }, { clave: 'otro', nombre: 'Otro' },
]
const campo = 'px-3 py-2 text-sm bg-background border border-input rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-ring'

/** Configuración › Recursos: vehículos, maquinaria, equipo y materiales que se asignan a las tareas. */
export default function RecursosPanel() {
  const qc = useQueryClient()
  const edita = usePermiso('catalogos.gestionar')
  const { data: recursos = [], isLoading } = useQuery({ queryKey: ['recursos'], queryFn: getRecursos })
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState<TipoRecurso>('vehiculo')
  const [codigo, setCodigo] = useState('')
  const recargar = () => qc.invalidateQueries({ queryKey: ['recursos'] })
  const intentar = async (accion: () => Promise<unknown>, error: string, ok?: string) => {
    try {
      await accion()
      await recargar()
      if (ok) toast.success(ok)
    } catch (err) {
      toast.error(mensajeDeError(err, error))
    }
  }

  return (
    <div className="max-w-3xl space-y-4">
      <p className="text-sm text-muted-foreground">
        Se asignan a las tareas. Si un vehículo, una máquina o un equipo queda en dos tareas con fechas cruzadas, el sistema avisa.
        Los materiales se consumen y no se cruzan. {!edita && 'Su rol no permite editar el catálogo.'}
      </p>
      {edita && (
        <form className="flex flex-wrap gap-2" onSubmit={e => {
          e.preventDefault()
          if (!nombre.trim()) return
          intentar(async () => {
            await crearRecurso({ nombre: nombre.trim(), tipo, codigo: codigo.trim() })
            setNombre(''); setCodigo('')
          }, 'No se pudo crear el recurso.', 'Recurso agregado')
        }}>
          <input aria-label="Nombre del recurso" required maxLength={80} value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre (vagoneta, retroexcavadora…)" className={`${campo} flex-1 min-w-48`} />
          <select aria-label="Tipo de recurso" value={tipo} onChange={e => setTipo(e.target.value as TipoRecurso)} className={campo}>
            {TIPOS.map(t => <option key={t.clave} value={t.clave}>{t.nombre}</option>)}
          </select>
          <input aria-label="Código, placa o serie" maxLength={40} value={codigo} onChange={e => setCodigo(e.target.value)} placeholder="Placa o serie" className={`${campo} w-36`} />
          <button type="submit" className="px-4 py-2 bg-ocean-500 hover:bg-ocean-600 text-white text-xs font-semibold rounded-xl">Agregar</button>
        </form>
      )}
      {isLoading ? <div className="h-24 bg-muted rounded-2xl animate-pulse" /> : recursos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Todavía no hay recursos en el catálogo.</p>
      ) : (
        <ul className="bg-card border border-border rounded-2xl divide-y divide-border">
          {recursos.map(r => (
            <li key={r.recurso_ID} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${r.activo ? 'text-foreground' : 'text-muted-foreground line-through'}`}>{r.nombre}</p>
                <p className="text-xs text-muted-foreground">{r.tipo_display}{r.codigo ? ` · ${r.codigo}` : ''}</p>
              </div>
              <label className="flex items-center gap-1.5 text-xs text-foreground">
                <input type="checkbox" checked={r.activo} disabled={!edita}
                  onChange={e => intentar(() => actualizarRecurso(r.recurso_ID, { activo: e.target.checked }), 'No se pudo cambiar el recurso.')} />
                Disponible
              </label>
              {edita && (
                <button type="button" aria-label={`Borrar ${r.nombre}`} onClick={async () => {
                  if (!(await confirmar({ titulo: `¿Borrar «${r.nombre}»?`, mensaje: 'Si ya se usó en tareas no se puede borrar: márquelo como no disponible.', accion: 'Borrar' }))) return
                  intentar(() => borrarRecurso(r.recurso_ID), 'No se pudo borrar: ya se usó en tareas.')
                }} className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                  <Trash2 size={13} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
