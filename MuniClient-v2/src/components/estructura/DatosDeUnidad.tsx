import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { FileText, X } from 'lucide-react'
import { toast } from 'sonner'
import Dialogo from '@/components/common/Dialogo'
import type { DatosDeUnidad as Datos, User } from '@/types'
import { mensajeDeError } from '@/lib/errores'

const campo = 'w-full px-3 py-2 text-sm bg-background border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-70'

/** Botón «Más datos» de una dirección o un departamento: código, descripción, suplente, presupuesto, contacto y metas. */
export default function DatosDeUnidad({ nombre, datos, jefe, users, puedeEditar, guardar, onSaved }: {
  nombre: string
  datos: Datos
  jefe?: string | null
  users: User[]
  puedeEditar: boolean
  guardar: (cambios: object) => Promise<unknown>
  onSaved: () => void
}) {
  const [abierto, setAbierto] = useState(false)
  return (
    <>
      <button type="button" aria-label={`Más datos de ${nombre}`} onClick={() => setAbierto(true)}
        className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
        <FileText size={13} />
      </button>
      <AnimatePresence>
        {abierto && (
          <Formulario nombre={nombre} datos={datos} jefe={jefe} users={users} puedeEditar={puedeEditar} guardar={guardar}
            onCerrar={() => setAbierto(false)} onSaved={onSaved} />
        )}
      </AnimatePresence>
    </>
  )
}

function Formulario({ nombre, datos, jefe, users, puedeEditar, guardar, onCerrar, onSaved }: {
  nombre: string
  datos: Datos
  jefe?: string | null
  users: User[]
  puedeEditar: boolean
  guardar: (cambios: object) => Promise<unknown>
  onCerrar: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    codigo: datos.codigo ?? '',
    descripcion: datos.descripcion ?? '',
    suplente: datos.suplente ?? '',
    presupuesto_anual: datos.presupuesto_anual ?? '',
    correo: datos.correo ?? '',
    telefono: datos.telefono ?? '',
    metas: (datos.metas ?? []).join('\n'),
  })
  const [guardando, setGuardando] = useState(false)
  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }))
  // El suplente no puede ser el jefe; quien ya estaba elegido se conserva aunque no esté en la lista.
  const candidatos = users.filter(u => u.user_ID !== jefe && (u.is_active !== false || u.user_ID === form.suplente))
  const titulo = `Datos de ${nombre}`

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    setGuardando(true)
    try {
      await guardar({
        codigo: form.codigo.trim(),
        descripcion: form.descripcion.trim(),
        suplente: form.suplente || null,
        presupuesto_anual: form.presupuesto_anual === '' ? null : form.presupuesto_anual,
        correo: form.correo.trim(),
        telefono: form.telefono.trim(),
        metas: form.metas.split('\n').map(m => m.trim()).filter(Boolean),
      })
      toast.success('Datos guardados')
      onSaved()
      onCerrar()
    } catch (err) {
      toast.error(mensajeDeError(err, 'No se pudieron guardar los datos.'))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialogo titulo={titulo} onCerrar={onCerrar}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <h2 className="text-base font-bold text-foreground">{titulo}</h2>
          <button type="button" aria-label="Cerrar" onClick={onCerrar} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground">
            <X size={15} />
          </button>
        </div>
        <form onSubmit={enviar} className="p-6 space-y-3 overflow-y-auto">
          <fieldset disabled={!puedeEditar} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-[8rem_1fr] gap-3">
              <div className="space-y-1.5">
                <label htmlFor="unidad-codigo" className="text-xs font-semibold text-muted-foreground">Código</label>
                <input id="unidad-codigo" maxLength={20} value={form.codigo} onChange={e => set('codigo', e.target.value)} className={campo} />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="unidad-suplente" className="text-xs font-semibold text-muted-foreground">Suplente de la jefatura</label>
                <select id="unidad-suplente" value={form.suplente} onChange={e => set('suplente', e.target.value)} className={campo}>
                  <option value="">Sin suplente</option>
                  {candidatos.map(u => <option key={u.user_ID} value={u.user_ID}>{u.first_name} {u.last_name}</option>)}
                </select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground -mt-1">Mientras la jefatura tiene una ausencia registrada, la suplencia decide lo que decidiría ella, solo aquí.</p>
            <div className="space-y-1.5">
              <label htmlFor="unidad-descripcion" className="text-xs font-semibold text-muted-foreground">Descripción</label>
              <textarea id="unidad-descripcion" rows={2} maxLength={500} value={form.descripcion} onChange={e => set('descripcion', e.target.value)} className={campo} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="unidad-presupuesto" className="text-xs font-semibold text-muted-foreground">Presupuesto anual (₡)</label>
                <input id="unidad-presupuesto" type="number" min={0} step="0.01" inputMode="decimal" value={form.presupuesto_anual} onChange={e => set('presupuesto_anual', e.target.value)} className={campo} />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="unidad-correo" className="text-xs font-semibold text-muted-foreground">Correo</label>
                <input id="unidad-correo" type="email" value={form.correo} onChange={e => set('correo', e.target.value)} className={campo} />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="unidad-telefono" className="text-xs font-semibold text-muted-foreground">Teléfono</label>
                <input id="unidad-telefono" type="tel" maxLength={20} value={form.telefono} onChange={e => set('telefono', e.target.value)} className={campo} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="unidad-metas" className="text-xs font-semibold text-muted-foreground">Metas del año (una por línea)</label>
              <textarea id="unidad-metas" rows={4} value={form.metas} onChange={e => set('metas', e.target.value)} className={campo} />
            </div>
          </fieldset>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onCerrar} className="px-4 py-2 text-sm text-muted-foreground hover:bg-accent rounded-xl">
              {puedeEditar ? 'Cancelar' : 'Cerrar'}
            </button>
            {puedeEditar && (
              <button type="submit" disabled={guardando}
                className="px-4 py-2 text-sm font-semibold bg-ocean-500 hover:bg-ocean-600 text-white rounded-xl disabled:opacity-60">
                {guardando ? 'Guardando…' : 'Guardar datos'}
              </button>
            )}
          </div>
        </form>
      </motion.div>
    </Dialogo>
  )
}
