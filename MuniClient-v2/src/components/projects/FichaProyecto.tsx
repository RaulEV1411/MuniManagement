import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ExternalLink, Pencil, Plus, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { getFuentes, patchProject } from '@/lib/api'
import type { FuenteFinanciamiento, Indicador, Project } from '@/types'
import { mensajeDeError } from '@/lib/errores'
import { useMarca } from '@/hooks/useMarca'
import { cn } from '@/lib/utils'
import Dialogo from '@/components/common/Dialogo'
import ElegirPunto from '@/components/mapa/ElegirPunto'
import { centroDeLaInstitucion, puntoEscrito } from '@/components/mapa/tipos'
import { EntradasDeCampos } from '@/components/campos/CamposPersonalizados'
import {
  cambiosParaEnviar, camposQueAplican, datosConValor, formDeCampos, useCampos, yaTieneValor, type FormDeCampos,
} from '@/lib/camposPersonalizados'

const numero = (n: number) => new Intl.NumberFormat('es-CR', { maximumFractionDigits: 2 }).format(n)
const campo = 'w-full px-3 py-2 text-sm bg-background border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'

function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{etiqueta}</dt>
      <dd className="text-sm text-foreground break-words">{children}</dd>
    </div>
  )
}

/** Ficha del proyecto: expediente, SICOP, financiamiento, ubicación, objetivo, beneficiarios e indicadores. */
export default function FichaProyecto({ project, puedeEditar, onGuardado }: {
  project: Project
  puedeEditar: boolean
  onGuardado: () => Promise<unknown> | void
}) {
  const [editando, setEditando] = useState(false)
  const { data: campos = [] } = useCampos()
  const adicionales = datosConValor(campos.filter(c => c.aplica_a === 'proyecto'), project.campos_extra)
  const indicadores = project.indicadores ?? []
  const hayPunto = project.latitud != null && project.longitud != null
  const vacia = !project.codigo && !project.numero_sicop && !project.fuente_financiamiento && !project.distrito && !hayPunto
    && !project.objetivo && project.beneficiarios == null && indicadores.length === 0 && adicionales.length === 0

  return (
    <section aria-labelledby="ficha-titulo" className="rounded-2xl border border-border bg-card p-5">
      <header className="flex items-center justify-between gap-2 mb-4">
        <h3 id="ficha-titulo" className="text-base font-semibold text-foreground">Ficha del proyecto</h3>
        {puedeEditar && (
          <button type="button" onClick={() => setEditando(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted">
            <Pencil className="h-3.5 w-3.5" /> Editar ficha
          </button>
        )}
      </header>

      {vacia ? (
        <p className="text-xs text-muted-foreground italic">
          Sin datos todavía: expediente, número de SICOP, financiamiento, ubicación, objetivo e indicadores.
        </p>
      ) : (
        <div className="space-y-4">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {project.codigo && <Dato etiqueta="Código o expediente">{project.codigo}</Dato>}
            {project.numero_sicop && <Dato etiqueta="N.º de SICOP">{project.numero_sicop}</Dato>}
            {project.fuente_financiamiento_nombre && <Dato etiqueta="Financiamiento">{project.fuente_financiamiento_nombre}</Dato>}
            {project.distrito && <Dato etiqueta="Distrito">{project.distrito}</Dato>}
            {hayPunto && (
              <Dato etiqueta="Ubicación">
                <a
                  href={`https://www.openstreetmap.org/?mlat=${project.latitud}&mlon=${project.longitud}#map=17/${project.latitud}/${project.longitud}`}
                  target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-ocean-500 dark:text-ocean-200 underline underline-offset-2"
                >
                  {Number(project.latitud)}, {Number(project.longitud)}
                  <ExternalLink className="h-3 w-3" aria-hidden />
                  <span className="sr-only">(ver en el mapa, se abre en otra pestaña)</span>
                </a>
              </Dato>
            )}
            {project.beneficiarios != null && <Dato etiqueta="Beneficiarios estimados">{numero(project.beneficiarios)} personas</Dato>}
          </dl>
          {project.objetivo && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Objetivo</h4>
              <p className="text-sm text-foreground whitespace-pre-line">{project.objetivo}</p>
            </div>
          )}
          {indicadores.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Indicadores</h4>
              <ul className="space-y-2.5">
                {indicadores.map((ind, i) => {
                  const pct = ind.meta ? Math.min(100, Math.round(((ind.logrado ?? 0) / ind.meta) * 100)) : null
                  return (
                    <li key={i} className="text-sm">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-foreground">{ind.nombre}</span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {numero(ind.logrado ?? 0)}{ind.meta != null && <> de {numero(ind.meta)}</>}{ind.unidad && ` ${ind.unidad}`}
                          {pct != null && ` · ${pct} %`}
                        </span>
                      </div>
                      {pct != null && (
                        <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden" aria-hidden>
                          <div className="h-full rounded-full bg-ocean-500 dark:bg-ocean-300" style={{ width: `${pct}%` }} />
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
          {adicionales.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-2">Datos adicionales</h4>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {adicionales.map(({ campo, texto }) => <Dato key={campo.campo_ID} etiqueta={campo.nombre}>{texto}</Dato>)}
              </dl>
            </div>
          )}
        </div>
      )}

      {editando && <EditarFicha project={project} onCerrar={() => setEditando(false)} onGuardado={onGuardado} />}
    </section>
  )
}

type FilaIndicador = { nombre: string; unidad: string; meta: string; logrado: string }

function EditarFicha({ project, onCerrar, onGuardado }: {
  project: Project
  onCerrar: () => void
  onGuardado: () => Promise<unknown> | void
}) {
  const marca = useMarca()
  const { distritos } = marca
  const { data: fuentes = [] } = useQuery<FuenteFinanciamiento[]>({ queryKey: ['fuentes'], queryFn: getFuentes })
  const [guardando, setGuardando] = useState(false)
  const [form, setForm] = useState({
    codigo: project.codigo ?? '',
    numero_sicop: project.numero_sicop ?? '',
    fuente_financiamiento: project.fuente_financiamiento ?? '',
    distrito: project.distrito ?? '',
    latitud: project.latitud != null ? String(Number(project.latitud)) : '',
    longitud: project.longitud != null ? String(Number(project.longitud)) : '',
    objetivo: project.objetivo ?? '',
    beneficiarios: project.beneficiarios != null ? String(project.beneficiarios) : '',
  })
  const [indicadores, setIndicadores] = useState<FilaIndicador[]>(
    (project.indicadores ?? []).map(i => ({
      nombre: i.nombre, unidad: i.unidad, meta: i.meta != null ? String(i.meta) : '', logrado: i.logrado != null ? String(i.logrado) : '',
    })),
  )
  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }))
  // Solo lo que se toca: si el catálogo llega después de abrir, lo guardado no se pierde.
  const { data: campos = [] } = useCampos()
  const aplicables = camposQueAplican(campos, 'proyecto', (project.tipos ?? []).map(t => t.tipos_ID))
  const [cambiosExtra, setCambiosExtra] = useState<FormDeCampos>({})
  const extra = { ...formDeCampos(aplicables, project.campos_extra), ...cambiosExtra }
  const cambiarIndicador = (i: number, k: keyof FilaIndicador, v: string) =>
    setIndicadores(filas => filas.map((f, j) => (j === i ? { ...f, [k]: v } : f)))
  // Con distritos configurados se elige de la lista (y el que ya tenía se mantiene aunque ya no esté);
  // sin ellos, se escribe.
  const opcionesDistrito = form.distrito && !distritos.includes(form.distrito) ? [form.distrito, ...distritos] : distritos

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((form.latitud === '') !== (form.longitud === '')) {
      toast.error('Indique la latitud y la longitud, o ninguna de las dos.')
      return
    }
    setGuardando(true)
    try {
      await patchProject(project.proyect_ID, {
        codigo: form.codigo.trim(),
        numero_sicop: form.numero_sicop.trim(),
        fuente_financiamiento: form.fuente_financiamiento || null,
        distrito: form.distrito.trim(),
        // Seis decimales (unos 10 cm) es lo que guarda el servidor: lo que se copia de un mapa suele traer más.
        latitud: form.latitud === '' ? null : Number(form.latitud).toFixed(6),
        longitud: form.longitud === '' ? null : Number(form.longitud).toFixed(6),
        objetivo: form.objetivo.trim(),
        beneficiarios: form.beneficiarios === '' ? null : Number(form.beneficiarios),
        indicadores: indicadores
          .filter(f => f.nombre.trim())
          .map<Indicador>(f => ({
            nombre: f.nombre.trim(), unidad: f.unidad.trim(),
            meta: f.meta === '' ? null : Number(f.meta), logrado: f.logrado === '' ? null : Number(f.logrado),
          })),
        ...cambiosParaEnviar(aplicables, extra, cambiosExtra),
      })
      await onGuardado()
      toast.success('Ficha guardada')
      onCerrar()
    } catch (err) {
      toast.error(mensajeDeError(err, 'No se pudo guardar la ficha'))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialogo titulo="Editar ficha" onCerrar={onCerrar}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card border border-border rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <h2 className="text-base font-bold text-foreground">Editar ficha</h2>
          <button type="button" aria-label="Cerrar" onClick={onCerrar} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground">
            <X size={15} />
          </button>
        </div>
        <form onSubmit={guardar} className="p-6 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="ficha-codigo" className="text-xs font-semibold text-muted-foreground">Código o expediente</label>
              <input id="ficha-codigo" maxLength={40} value={form.codigo} onChange={e => set('codigo', e.target.value)} placeholder="EXP-2026-014" className={campo} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="ficha-sicop" className="text-xs font-semibold text-muted-foreground">N.º de SICOP</label>
              <input id="ficha-sicop" maxLength={40} value={form.numero_sicop} onChange={e => set('numero_sicop', e.target.value)} placeholder="2026LA-000012-0002300001" className={campo} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="ficha-fuente" className="text-xs font-semibold text-muted-foreground">Fuente de financiamiento</label>
              <select id="ficha-fuente" value={form.fuente_financiamiento} onChange={e => set('fuente_financiamiento', e.target.value)} className={campo}>
                <option value="">Sin indicar</option>
                {fuentes.map(f => <option key={f.fuente_ID} value={f.fuente_ID}>{f.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="ficha-distrito" className="text-xs font-semibold text-muted-foreground">Distrito</label>
              {distritos.length > 0 ? (
                <select id="ficha-distrito" value={form.distrito} onChange={e => set('distrito', e.target.value)} className={campo}>
                  <option value="">Sin indicar</option>
                  {opcionesDistrito.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              ) : (
                <input id="ficha-distrito" maxLength={80} value={form.distrito} onChange={e => set('distrito', e.target.value)} className={campo} />
              )}
            </div>
            <div className="space-y-1.5">
              <label htmlFor="ficha-latitud" className="text-xs font-semibold text-muted-foreground">Latitud</label>
              <input id="ficha-latitud" type="number" step="any" min={-90} max={90} value={form.latitud} onChange={e => set('latitud', e.target.value)} placeholder="9.934739" className={campo} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="ficha-longitud" className="text-xs font-semibold text-muted-foreground">Longitud</label>
              <input id="ficha-longitud" type="number" step="any" min={-180} max={180} value={form.longitud} onChange={e => set('longitud', e.target.value)} placeholder="-84.087502" className={campo} />
            </div>
          </div>
          <ElegirPunto
            etiqueta="Mapa para marcar la ubicación del proyecto"
            punto={puntoEscrito(form.latitud, form.longitud)}
            centro={centroDeLaInstitucion(marca)}
            alElegir={(lat, lng) => setForm(f => ({ ...f, latitud: String(lat), longitud: String(lng) }))}
          />
          <div className="space-y-1.5">
            <label htmlFor="ficha-objetivo" className="text-xs font-semibold text-muted-foreground">Objetivo</label>
            <textarea id="ficha-objetivo" maxLength={1000} rows={3} value={form.objetivo} onChange={e => set('objetivo', e.target.value)} className={cn(campo, 'resize-none')} />
          </div>
          <div className="space-y-1.5 sm:w-1/2">
            <label htmlFor="ficha-beneficiarios" className="text-xs font-semibold text-muted-foreground">Beneficiarios estimados (personas)</label>
            <input id="ficha-beneficiarios" type="number" min={0} step={1} value={form.beneficiarios} onChange={e => set('beneficiarios', e.target.value)} className={campo} />
          </div>

          <fieldset className="space-y-2">
            <legend className="text-xs font-semibold text-muted-foreground mb-1">Indicadores</legend>
            {indicadores.length > 0 && (
              <div aria-hidden className="hidden sm:grid grid-cols-[1fr_7rem_5rem_5rem_2rem] gap-2 text-xs text-muted-foreground">
                <span>Nombre</span><span>Unidad</span><span>Meta</span><span>Logrado</span>
              </div>
            )}
            {indicadores.map((f, i) => (
              // En el celular, el nombre va en su propia línea.
              <div key={i} className="grid grid-cols-[1fr_1fr_1fr_2rem] sm:grid-cols-[1fr_7rem_5rem_5rem_2rem] gap-2 items-center pb-2 border-b border-border/60 sm:border-0 sm:pb-0">
                <input aria-label={`Indicador ${i + 1}: nombre`} maxLength={120} value={f.nombre} onChange={e => cambiarIndicador(i, 'nombre', e.target.value)} placeholder="Acera construida" className={cn(campo, 'col-span-4 sm:col-span-1')} />
                <input aria-label={`Indicador ${i + 1}: unidad`} maxLength={30} value={f.unidad} onChange={e => cambiarIndicador(i, 'unidad', e.target.value)} placeholder="m" className={campo} />
                <input aria-label={`Indicador ${i + 1}: meta`} type="number" min={0} step="any" value={f.meta} onChange={e => cambiarIndicador(i, 'meta', e.target.value)} placeholder="Meta" className={campo} />
                <input aria-label={`Indicador ${i + 1}: logrado`} type="number" min={0} step="any" value={f.logrado} onChange={e => cambiarIndicador(i, 'logrado', e.target.value)} placeholder="Logrado" className={campo} />
                <button type="button" aria-label={`Quitar el indicador ${i + 1}`} onClick={() => setIndicadores(filas => filas.filter((_, j) => j !== i))}
                  className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
            {indicadores.length < 20 && (
              <button type="button" onClick={() => setIndicadores(filas => [...filas, { nombre: '', unidad: '', meta: '', logrado: '' }])}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-ocean-500 dark:text-ocean-200 hover:underline">
                <Plus className="h-3.5 w-3.5" /> Agregar indicador
              </button>
            )}
          </fieldset>

          {aplicables.length > 0 && (
            <fieldset className="space-y-2">
              <legend className="text-xs font-semibold text-muted-foreground mb-1">Datos adicionales</legend>
              <EntradasDeCampos campos={aplicables} form={extra} prefijo="ficha-extra" requerido={yaTieneValor(project.campos_extra)}
                onChange={(id, v) => setCambiosExtra(c => ({ ...c, [id]: v }))} />
            </fieldset>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onCerrar} className="px-4 py-2 text-sm text-muted-foreground hover:bg-accent rounded-xl">Cancelar</button>
            <button type="submit" disabled={guardando}
              className="px-4 py-2 text-sm font-semibold bg-ocean-500 hover:bg-ocean-600 text-white rounded-xl disabled:opacity-60">
              {guardando ? 'Guardando...' : 'Guardar ficha'}
            </button>
          </div>
        </form>
      </motion.div>
    </Dialogo>
  )
}
