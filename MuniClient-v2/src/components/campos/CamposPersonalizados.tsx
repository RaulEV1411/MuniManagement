import type { CampoPersonalizado } from '@/types'
import type { FormDeCampos } from '@/lib/camposPersonalizados'

const estilo = 'w-full px-3 py-2 text-sm bg-background border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'

/** Una entrada por campo, según su tipo de dato. Al editar, `requerido` marca solo los obligatorios que ya
 * tienen valor: no se vacían, pero uno anterior al campo no impide guardar lo demás. */
export function EntradasDeCampos({ campos, form, onChange, prefijo, requerido = c => c.obligatorio }: {
  campos: CampoPersonalizado[]
  form: FormDeCampos
  onChange: (campoId: string, valor: string) => void
  prefijo: string
  requerido?: (campo: CampoPersonalizado) => boolean
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {campos.map(c => {
        const id = `${prefijo}-${c.campo_ID}`
        const valor = form[c.campo_ID] ?? ''
        const props = {
          id, value: valor, required: requerido(c), className: estilo,
          'aria-describedby': c.ayuda ? `${id}-ayuda` : undefined,
          onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => onChange(c.campo_ID, e.target.value),
        }
        return (
          <div key={c.campo_ID} className="space-y-1.5">
            <label htmlFor={id} className="text-xs font-semibold text-muted-foreground">
              {c.nombre}{c.obligatorio && <span aria-hidden className="text-destructive"> *</span>}
            </label>
            {c.tipo_dato === 'texto' && <input type="text" maxLength={500} {...props} />}
            {c.tipo_dato === 'numero' && <input type="number" step="any" inputMode="decimal" {...props} />}
            {c.tipo_dato === 'fecha' && <input type="date" {...props} />}
            {c.tipo_dato === 'lista' && (
              <select {...props}>
                <option value="">{c.obligatorio ? 'Elija una opción' : 'Sin elegir'}</option>
                {c.opciones.map(o => <option key={o} value={o}>{o}</option>)}
                {valor && !c.opciones.includes(valor) && <option value={valor}>{valor} (ya no está en la lista)</option>}
              </select>
            )}
            {c.tipo_dato === 'si_no' && (
              <select {...props}>
                <option value="">Sin indicar</option>
                <option value="si">Sí</option>
                <option value="no">No</option>
              </select>
            )}
            {c.ayuda && <p id={`${id}-ayuda`} className="text-[11px] text-muted-foreground">{c.ayuda}</p>}
          </div>
        )
      })}
    </div>
  )
}
