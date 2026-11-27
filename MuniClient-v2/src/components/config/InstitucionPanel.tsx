import { useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ImageUp, Trash2, AlertTriangle } from 'lucide-react'
import { borrarLogo, getConfiguracion, subirLogo, updateConfiguracion } from '@/lib/api'
import ErrorDeCarga from '@/components/common/ErrorDeCarga'
import { mensajeDeError } from '@/lib/errores'
import { contrasteConBlanco, type Marca } from '@/lib/marca'
import { useMarca } from '@/hooks/useMarca'
import LogoInstitucion from '@/components/common/LogoInstitucion'
import { textoSobre } from '@/lib/colores'
import { usePermiso } from '@/hooks/usePermiso'

const MONEDAS = [
  ['CRC', 'Colón costarricense'], ['USD', 'Dólar estadounidense'], ['GTQ', 'Quetzal'], ['HNL', 'Lempira'],
  ['NIO', 'Córdoba'], ['PAB', 'Balboa'], ['MXN', 'Peso mexicano'], ['COP', 'Peso colombiano'], ['DOP', 'Peso dominicano'],
  ['EUR', 'Euro'],
]
const HEX = /^#[0-9a-fA-F]{6}$/
const cls = 'w-full px-3 py-2 text-sm bg-background border border-input rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60'

type Campos = Omit<Marca, 'logo'>

// Identidad de la instalación: lo que ven el login, el menú, los reportes y el portal público.
// El formulario se arma recién con la configuración real: si se armara con los valores por
// defecto mientras carga, guardar los pisaría.
export default function InstitucionPanel() {
  const { data, isError, error, refetch } = useQuery({ queryKey: ['configuracion'], queryFn: getConfiguracion })
  if (isError) return <ErrorDeCarga error={error} onReintentar={refetch} que="los datos de la institución" />
  if (!data) return <div className="h-40 rounded-2xl bg-muted/40 animate-pulse max-w-3xl" role="status" aria-label="Cargando" />
  return <FormularioInstitucion inicial={data} />
}

function FormularioInstitucion({ inicial }: { inicial: Marca }) {
  const qc = useQueryClient()
  const marca = useMarca()
  const esAdmin = usePermiso('configuracion.gestionar')
  const [form, setForm] = useState<Campos>(() => ({ ...inicial }))
  const [guardando, setGuardando] = useState(false)
  const [distritos, setDistritos] = useState(() => (inicial.distritos ?? []).join('\n'))
  const archivo = useRef<HTMLInputElement>(null)
  const set = (k: keyof Campos, v: string) => setForm(f => ({ ...f, [k]: v }))

  const contraste = HEX.test(form.color_primario) ? contrasteConBlanco(form.color_primario) : 0
  const contrasteBajo = HEX.test(form.color_primario) && contraste < 4.5

  const actualizar = (datos: Marca) => qc.setQueryData(['configuracion'], datos)

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    setGuardando(true)
    try {
      const { nombre, ubicacion, color_primario, color_acento, correo_soporte, telefono_soporte, horario_soporte, moneda, retencion_auditoria_dias } = form
      actualizar(await updateConfiguracion({
        nombre, ubicacion, color_primario, color_acento, correo_soporte, telefono_soporte, horario_soporte, moneda, retencion_auditoria_dias,
        distritos: distritos.split('\n').map(d => d.trim()).filter(Boolean),
      }))
      toast.success('Datos de la institución guardados')
    } catch (err) {
      toast.error(mensajeDeError(err, 'No se pudieron guardar los datos'))
    } finally {
      setGuardando(false)
    }
  }

  const cambiarLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    try {
      actualizar(await subirLogo(f))
      toast.success('Logo actualizado')
    } catch (err) {
      toast.error(mensajeDeError(err, 'No se pudo subir el logo'))
    }
  }

  const quitarLogo = async () => {
    try {
      actualizar(await borrarLogo())
      toast.success('Logo quitado')
    } catch (err) {
      toast.error(mensajeDeError(err, 'No se pudo quitar el logo'))
    }
  }

  return (
    <form onSubmit={guardar} className="max-w-3xl space-y-5">
      {!esAdmin && (
        <p className="text-xs text-muted-foreground bg-muted rounded-xl px-3 py-2">Su rol no permite cambiar estos datos.</p>
      )}

      <section className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-bold text-foreground">Institución</h2>
        <div className="flex items-center gap-4">
          <LogoInstitucion tamano={56} />
          {esAdmin && (
            <div className="flex gap-2">
              <input ref={archivo} id="logo" type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={cambiarLogo} />
              <button type="button" onClick={() => archivo.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-border hover:bg-accent">
                <ImageUp size={13} aria-hidden="true" /> {marca.logo ? 'Cambiar logo' : 'Subir logo'}
              </button>
              {marca.logo && (
                <button type="button" onClick={quitarLogo} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-border hover:bg-destructive/10 hover:text-destructive">
                  <Trash2 size={13} aria-hidden="true" /> Quitar
                </button>
              )}
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground">PNG, JPG o WebP de hasta 5 MB. También se usa como ícono de la pestaña del navegador.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="inst-nombre" className="text-xs font-semibold text-muted-foreground">Nombre *</label>
            <input id="inst-nombre" required value={form.nombre} onChange={e => set('nombre', e.target.value)} disabled={!esAdmin} placeholder="Municipalidad de …" className={cls} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="inst-ubicacion" className="text-xs font-semibold text-muted-foreground">Ubicación</label>
            <input id="inst-ubicacion" value={form.ubicacion} onChange={e => set('ubicacion', e.target.value)} disabled={!esAdmin} placeholder="Cantón, provincia" className={cls} />
          </div>
        </div>
      </section>

      <section className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-bold text-foreground">Colores</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {([['color_primario', 'Color principal (botones, encabezados)'], ['color_acento', 'Color de acento']] as const).map(([campo, etiqueta]) => (
            <div key={campo} className="space-y-1.5">
              <label htmlFor={`inst-${campo}`} className="text-xs font-semibold text-muted-foreground">{etiqueta}</label>
              <div className="flex gap-2">
                <input type="color" aria-label={`${etiqueta}: selector`} value={HEX.test(form[campo]) ? form[campo] : '#000000'} onChange={e => set(campo, e.target.value)} disabled={!esAdmin} className="h-9 w-12 rounded-lg border border-input bg-background p-1 disabled:opacity-60" />
                <input id={`inst-${campo}`} value={form[campo]} onChange={e => set(campo, e.target.value)} disabled={!esAdmin} pattern="#[0-9a-fA-F]{6}" className={cls} />
              </div>
            </div>
          ))}
        </div>
        {contrasteBajo && (
          <p className="flex items-center gap-2 text-xs text-destructive" role="alert">
            <AlertTriangle size={13} aria-hidden="true" />
            El texto blanco sobre el color principal no se lee (contraste {contraste.toFixed(1)}:1, mínimo 4,5:1). Elija un tono más oscuro.
          </p>
        )}
        <div className="flex items-center gap-2" aria-hidden="true">
          <span className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white" style={{ background: HEX.test(form.color_primario) ? form.color_primario : undefined }}>Botón de ejemplo</span>
          <span className="px-3 py-1.5 rounded-xl text-xs font-semibold" style={{ background: HEX.test(form.color_acento) ? form.color_acento : undefined, color: HEX.test(form.color_acento) ? textoSobre(form.color_acento) : undefined }}>Acento</span>
        </div>
      </section>

      <section className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-bold text-foreground">Soporte y moneda</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="inst-correo" className="text-xs font-semibold text-muted-foreground">Correo de soporte</label>
            <input id="inst-correo" type="email" value={form.correo_soporte} onChange={e => set('correo_soporte', e.target.value)} disabled={!esAdmin} className={cls} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="inst-telefono" className="text-xs font-semibold text-muted-foreground">Teléfono de soporte</label>
            <input id="inst-telefono" value={form.telefono_soporte} onChange={e => set('telefono_soporte', e.target.value)} disabled={!esAdmin} className={cls} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="inst-horario" className="text-xs font-semibold text-muted-foreground">Horario</label>
            <input id="inst-horario" value={form.horario_soporte} onChange={e => set('horario_soporte', e.target.value)} disabled={!esAdmin} placeholder="L-V 8:00–16:00" className={cls} />
          </div>
        </div>
        <div className="space-y-1.5 max-w-xs">
          <label htmlFor="inst-moneda" className="text-xs font-semibold text-muted-foreground">Moneda de los montos</label>
          <select id="inst-moneda" value={form.moneda} onChange={e => set('moneda', e.target.value)} disabled={!esAdmin} className={cls}>
            {MONEDAS.map(([codigo, nombre]) => <option key={codigo} value={codigo}>{codigo} · {nombre}</option>)}
          </select>
        </div>
      </section>

      <section className="bg-card border border-border rounded-2xl p-5 space-y-3" aria-labelledby="inst-distritos-titulo">
        <h2 id="inst-distritos-titulo" className="text-sm font-bold text-foreground">Distritos</h2>
        <div className="space-y-1.5 max-w-sm">
          <label htmlFor="inst-distritos" className="text-xs font-semibold text-muted-foreground">Distritos del cantón (uno por línea)</label>
          <textarea id="inst-distritos" rows={5} value={distritos} onChange={e => setDistritos(e.target.value)} disabled={!esAdmin}
            aria-describedby="inst-distritos-ayuda" className={`${cls} resize-y`} />
        </div>
        <p id="inst-distritos-ayuda" className="text-xs text-muted-foreground">
          Se eligen en la ficha de cada proyecto. Si la lista queda vacía, el distrito se escribe a mano.
        </p>
      </section>

      <section className="bg-card border border-border rounded-2xl p-5 space-y-3" aria-labelledby="inst-auditoria-titulo">
        <h2 id="inst-auditoria-titulo" className="text-sm font-bold text-foreground">Auditoría</h2>
        <div className="space-y-1.5 max-w-xs">
          <label htmlFor="inst-retencion" className="text-xs font-semibold text-muted-foreground">Conservar los registros (días)</label>
          <input
            id="inst-retencion" type="number" min={180} max={3650} required
            value={form.retencion_auditoria_dias}
            onChange={e => setForm(f => ({ ...f, retencion_auditoria_dias: Number(e.target.value) }))}
            disabled={!esAdmin} aria-describedby="inst-retencion-ayuda" className={cls}
          />
        </div>
        <p id="inst-retencion-ayuda" className="text-xs text-muted-foreground">
          De 180 a 3650 días. Cada noche se borran los registros y las sesiones cerradas más viejos que esto, y el borrado queda anotado.
          Revise el plazo que exige la normativa de archivo de la institución.
        </p>
      </section>

      {esAdmin && (
        <div className="flex justify-end">
          <button type="submit" disabled={guardando || contrasteBajo} className="px-4 py-2 text-sm font-semibold bg-ocean-500 hover:bg-ocean-600 text-white rounded-xl disabled:opacity-50">
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      )}
    </form>
  )
}
