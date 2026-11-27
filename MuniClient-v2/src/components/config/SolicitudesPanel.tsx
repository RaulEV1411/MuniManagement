import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  createReglaAprobacion, createTipoSolicitud, deleteReglaAprobacion, getReglasAprobacion, getTiposSolicitud,
  updateReglaAprobacion, updateTipoSolicitud,
} from '@/lib/api'
import type { EfectoSolicitud, NivelAprobacion, ReglaAprobacion, TipoSolicitud } from '@/types'
import { mensajeDeError } from '@/lib/errores'
import { usePermiso } from '@/hooks/usePermiso'
import { useMoneda } from '@/hooks/useMarca'

const NIVELES: { clave: NivelAprobacion; nombre: string }[] = [
  { clave: 'departamento', nombre: 'Jefatura del departamento' },
  { clave: 'direccion', nombre: 'Jefatura de la dirección' },
  { clave: 'alcaldia', nombre: 'Alcaldía' },
]
const EFECTOS: { clave: EfectoSolicitud; nombre: string }[] = [
  { clave: 'ninguno', nombre: 'Solo queda registrada' },
  { clave: 'plazo', nombre: 'Cambia la fecha de entrega' },
  { clave: 'aumento', nombre: 'Suma al presupuesto' },
  { clave: 'rebajo', nombre: 'Resta del presupuesto' },
  { clave: 'personal', nombre: 'Suma una persona al equipo' },
  { clave: 'responsable', nombre: 'Cambia el responsable' },
]
const campo = 'px-2 py-1 text-sm bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60'

function TarjetaDeTipo({ tipo, reglas, edita }: { tipo: TipoSolicitud; reglas: ReglaAprobacion[]; edita: boolean }) {
  const qc = useQueryClient()
  const { simbolo } = useMoneda()
  const unidad = tipo.efecto === 'plazo' ? 'días' : tipo.efecto === 'aumento' || tipo.efecto === 'rebajo' ? simbolo : null
  const recargar = () => qc.invalidateQueries({ queryKey: ['reglas-aprobacion'] })
  const guardar = async (accion: () => Promise<unknown>, ok?: string) => {
    try {
      await accion()
      if (ok) toast.success(ok)
    } catch (err) {
      toast.error(mensajeDeError(err, 'No se pudo guardar.'))
    }
  }
  const cambiarTipo = (datos: Partial<TipoSolicitud>) => guardar(async () => {
    await updateTipoSolicitud(tipo.tipo_ID, datos)
    await qc.invalidateQueries({ queryKey: ['tipos-solicitud'] })
  })
  return (
    <section aria-labelledby={`tipo-${tipo.tipo_ID}`} className="bg-card border border-border rounded-2xl p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 id={`tipo-${tipo.tipo_ID}`} className="text-sm font-bold text-foreground">{tipo.nombre}</h3>
        <span className="text-xs text-muted-foreground">· {tipo.efecto_display}</span>
        {tipo.is_system && <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Sistema</span>}
        <label className="ml-auto flex items-center gap-1.5 text-xs text-foreground">
          <input type="checkbox" checked={tipo.activo} disabled={!edita} onChange={e => cambiarTipo({ activo: e.target.checked })} />
          Se ofrece
        </label>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          Días para responder
          <input type="number" min={1} max={60} defaultValue={tipo.dias_respuesta} disabled={!edita} className={`${campo} w-16`}
            onBlur={e => Number(e.target.value) !== tipo.dias_respuesta && cambiarTipo({ dias_respuesta: Number(e.target.value) })} />
        </label>
      </div>
      <table className="w-full text-sm">
        <caption className="sr-only">Quién aprueba {tipo.nombre}</caption>
        <thead>
          <tr className="text-left text-xs text-muted-foreground">
            <th className="font-semibold py-1">Aprueba</th>
            <th className="font-semibold py-1">{unidad ? `Desde (${unidad})` : 'Interviene'}</th>
          </tr>
        </thead>
        <tbody>
          {NIVELES.map(n => {
            const regla = reglas.find(r => r.nivel === n.clave)
            return (
              <tr key={n.clave} className="border-t border-border">
                <td className="py-1.5">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={!!regla} disabled={!edita} aria-label={`${n.nombre} · ${tipo.nombre}`}
                      onChange={e => guardar(async () => {
                        if (e.target.checked) await createReglaAprobacion({ tipo: tipo.tipo_ID, nivel: n.clave, desde: 0 })
                        else if (regla) await deleteReglaAprobacion(regla.regla_ID)
                        await recargar()
                      })} />
                    {n.nombre}
                  </label>
                </td>
                <td className="py-1.5">
                  {regla && unidad ? (
                    <input type="number" min={0} step={1} defaultValue={regla.desde} disabled={!edita} className={`${campo} w-36`}
                      aria-label={`Desde cuánto aprueba ${n.nombre} · ${tipo.nombre}`}
                      onBlur={e => Number(e.target.value) !== regla.desde && guardar(async () => {
                        await updateReglaAprobacion(regla.regla_ID, { desde: Number(e.target.value) })
                        await recargar()
                      }, 'Umbral guardado')} />
                  ) : <span className="text-xs text-muted-foreground">{regla ? 'Siempre' : '—'}</span>}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </section>
  )
}

/** Configuración › Solicitudes: qué se puede pedir, cuánto hay para responder y quién aprueba según el monto o los días. */
export default function SolicitudesPanel() {
  const qc = useQueryClient()
  const edita = usePermiso('catalogos.gestionar')
  const { data: tipos = [] } = useQuery({ queryKey: ['tipos-solicitud'], queryFn: getTiposSolicitud })
  const { data: reglas = [] } = useQuery({ queryKey: ['reglas-aprobacion'], queryFn: getReglasAprobacion })
  const [nombre, setNombre] = useState('')
  const [efecto, setEfecto] = useState<EfectoSolicitud>('ninguno')

  const crear = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const tipo = await createTipoSolicitud({ nombre: nombre.trim(), efecto })
      await createReglaAprobacion({ tipo: tipo.tipo_ID, nivel: 'departamento', desde: 0 })
      setNombre('')
      await qc.invalidateQueries({ queryKey: ['tipos-solicitud'] })
      await qc.invalidateQueries({ queryKey: ['reglas-aprobacion'] })
      toast.success('Tipo de solicitud creado')
    } catch (err) {
      toast.error(mensajeDeError(err, 'No se pudo crear el tipo.'))
    }
  }

  return (
    <div className="max-w-3xl space-y-4">
      <p className="text-sm text-muted-foreground">
        Cada solicitud la aprueban, en orden, los niveles que correspondan a su monto o a sus días.
        Si un paso no se responde a tiempo, también lo puede decidir el nivel siguiente. Nadie aprueba lo que pidió.
        {!edita && ' Su rol no permite cambiar esta configuración.'}
      </p>
      {edita && (
        <form onSubmit={crear} className="flex flex-wrap gap-2">
          <input aria-label="Nombre del tipo nuevo" required maxLength={60} value={nombre} onChange={e => setNombre(e.target.value)}
            placeholder="Nuevo tipo de solicitud..." className={`${campo} flex-1 min-w-48 py-2 rounded-xl`} />
          <select aria-label="Qué hace al aprobarse" value={efecto} onChange={e => setEfecto(e.target.value as EfectoSolicitud)} className={`${campo} py-2 rounded-xl`}>
            {EFECTOS.map(o => <option key={o.clave} value={o.clave}>{o.nombre}</option>)}
          </select>
          <button type="submit" className="px-4 py-2 bg-ocean-500 hover:bg-ocean-600 text-white text-xs font-semibold rounded-xl">Crear</button>
        </form>
      )}
      {tipos.map(t => <TarjetaDeTipo key={t.tipo_ID} tipo={t} reglas={reglas.filter(r => r.tipo === t.tipo_ID)} edita={edita} />)}
    </div>
  )
}
