import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { getConfiguracion, updateConfiguracion } from '@/lib/api'
import type { Encargado, Marca } from '@/lib/marca'
import { mensajeDeError } from '@/lib/errores'
import { usePermiso } from '@/hooks/usePermiso'
import ErrorDeCarga from '@/components/common/ErrorDeCarga'

const cls = 'w-full px-3 py-2 text-sm bg-background border border-input rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60'
const VACIO: Encargado = { nombre: '', datos: '', finalidad: '', pais: '' }

/** Configuración › Privacidad: el texto propio del aviso y los encargados (Ley 8968). */
export default function PrivacidadPanel() {
  const { data, isError, error, refetch } = useQuery({ queryKey: ['configuracion'], queryFn: getConfiguracion })
  if (isError) return <ErrorDeCarga error={error} onReintentar={refetch} que="el aviso de privacidad" />
  if (!data) return <div className="h-40 rounded-2xl bg-muted/40 animate-pulse max-w-3xl" role="status" aria-label="Cargando" />
  return <Formulario inicial={data} />
}

function Formulario({ inicial }: { inicial: Marca }) {
  const qc = useQueryClient()
  const edita = usePermiso('configuracion.gestionar')
  const [texto, setTexto] = useState(inicial.aviso_privacidad)
  const [encargados, setEncargados] = useState<Encargado[]>(inicial.encargados)
  const [guardando, setGuardando] = useState(false)
  const cambiar = (i: number, campo: keyof Encargado, valor: string) =>
    setEncargados(lista => lista.map((e, j) => (j === i ? { ...e, [campo]: valor } : e)))

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    setGuardando(true)
    try {
      const nuevo = await updateConfiguracion({ aviso_privacidad: texto, encargados: encargados.filter(x => x.nombre.trim()) })
      qc.setQueryData(['configuracion'], nuevo)
      toast.success(nuevo.privacidad_version !== inicial.privacidad_version
        ? `Aviso publicado (versión ${nuevo.privacidad_version}). Cada persona lo aceptará al entrar.`
        : 'Sin cambios en el aviso.')
    } catch (err) {
      toast.error(mensajeDeError(err, 'No se pudo guardar el aviso.'))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form onSubmit={guardar} className="max-w-3xl space-y-4">
      <p className="text-sm text-muted-foreground">
        El aviso dice quién es responsable de los datos, para qué se usan, quién más los trata y cómo ejercer los derechos.
        La parte general la arma el sistema con los datos de la institución; acá se agrega lo propio y los encargados.
        Cambiar algo publica una versión nueva, y cada persona la vuelve a aceptar al entrar. Conviene validarlo con la asesoría legal.
        {' '}<Link to="/privacidad" target="_blank" className="font-semibold text-ocean-500 dark:text-ocean-200 hover:underline">Ver el aviso publicado</Link>
        {' '}(versión {inicial.privacidad_version}).
      </p>
      <section aria-labelledby="priv-encargados" className="bg-card border border-border rounded-2xl p-5 space-y-3">
        <h2 id="priv-encargados" className="text-sm font-bold text-foreground">Quién más trata los datos (encargados)</h2>
        <p className="text-xs text-muted-foreground">Por ejemplo: el hosting, el servicio de correo o el de fotos. El contrato de encargado lo firma la institución; acá solo se informa.</p>
        {encargados.map((e, i) => (
          <fieldset key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_8rem_auto] gap-2 items-end">
            <legend className="sr-only">Encargado {i + 1}</legend>
            {(['nombre', 'datos', 'finalidad', 'pais'] as const).map(campo => (
              <label key={campo} className="space-y-1 text-xs font-semibold text-muted-foreground">
                {{ nombre: 'Proveedor', datos: 'Qué datos', finalidad: 'Para qué', pais: 'País' }[campo]}
                <input value={e[campo]} maxLength={160} disabled={!edita} onChange={ev => cambiar(i, campo, ev.target.value)} className={cls} />
              </label>
            ))}
            {edita && (
              <button type="button" aria-label={`Quitar el encargado ${i + 1}`} onClick={() => setEncargados(l => l.filter((_, j) => j !== i))}
                className="p-2 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                <Trash2 size={14} />
              </button>
            )}
          </fieldset>
        ))}
        {edita && (
          <button type="button" onClick={() => setEncargados(l => [...l, { ...VACIO }])}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-border hover:bg-muted">
            <Plus size={12} aria-hidden="true" /> Agregar encargado
          </button>
        )}
      </section>
      <section aria-labelledby="priv-texto" className="bg-card border border-border rounded-2xl p-5 space-y-2">
        <h2 id="priv-texto" className="text-sm font-bold text-foreground">Texto propio de la institución</h2>
        <label htmlFor="priv-aviso" className="text-xs text-muted-foreground">Finalidades o condiciones adicionales (opcional). Se muestra al final del aviso.</label>
        <textarea id="priv-aviso" rows={5} value={texto} disabled={!edita} onChange={e => setTexto(e.target.value)} className={cls} />
      </section>
      {edita && (
        <div className="flex justify-end">
          <button type="submit" disabled={guardando} className="px-4 py-2 text-sm font-semibold bg-ocean-500 hover:bg-ocean-600 text-white rounded-xl disabled:opacity-50">
            {guardando ? 'Guardando…' : 'Guardar y publicar'}
          </button>
        </div>
      )}
    </form>
  )
}
