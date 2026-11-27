import { useRef, useState } from 'react'
import { Search } from 'lucide-react'
import Mapa from './Mapa'
import { BUSQUEDA_DE_DIRECCIONES, type Vista } from './tipos'

interface Resultado { nombre: string; lat: number; lng: number }

const campo = 'w-full px-3 py-2 text-sm bg-background border border-input rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-ring'

/** Marcar un punto: tocando el mapa o buscando una dirección (Nominatim). La latitud y la longitud se siguen
 * pudiendo escribir a mano en el formulario que lo usa. */
export default function ElegirPunto({ punto, centro, alElegir, etiqueta }: {
  punto: { lat: number; lng: number } | null
  centro: Vista | null
  alElegir: (lat: number, lng: number) => void
  etiqueta: string
}) {
  const [texto, setTexto] = useState('')
  const [resultados, setResultados] = useState<Resultado[] | null>(null)
  const [buscando, setBuscando] = useState(false)
  const [error, setError] = useState('')
  const [irA, setIrA] = useState<Vista | null>(null)
  // Política de Nominatim: una búsqueda por pedido y como máximo una por segundo; lo ya buscado no se repite.
  const ultima = useRef(0)
  const guardadas = useRef(new Map<string, Resultado[]>())
  // El estado `buscando` llega en el próximo render: el ref corta en el acto una segunda búsqueda durante la espera.
  const enCurso = useRef(false)

  const buscar = async () => {
    const q = texto.trim()
    if (!q || enCurso.current) return
    setError('')
    const previa = guardadas.current.get(q)
    if (previa) { setResultados(previa); return }
    enCurso.current = true
    setBuscando(true)
    const espera = 1000 - (Date.now() - ultima.current)
    if (espera > 0) await new Promise(r => setTimeout(r, espera))
    ultima.current = Date.now()
    try {
      const url = new URL(BUSQUEDA_DE_DIRECCIONES)
      url.search = new URLSearchParams({ q, format: 'jsonv2', limit: '5', 'accept-language': 'es' }).toString()
      if (centro) {
        // Prefiere lo cercano al cantón, sin descartar lo demás.
        const d = 0.5
        url.searchParams.set('viewbox', [centro.lng - d, centro.lat + d, centro.lng + d, centro.lat - d].join(','))
      }
      const r = await fetch(url, { headers: { Accept: 'application/json' } })
      if (!r.ok) throw new Error(String(r.status))
      const datos = (await r.json()) as { display_name: string; lat: string; lon: string }[]
      const lista = datos.map(x => ({ nombre: x.display_name, lat: Number(Number(x.lat).toFixed(6)), lng: Number(Number(x.lon).toFixed(6)) }))
      guardadas.current.set(q, lista)
      setResultados(lista)
    } catch {
      setError('No se pudo buscar la dirección. Marque el punto en el mapa o escriba las coordenadas.')
    } finally {
      enCurso.current = false
      setBuscando(false)
    }
  }

  const elegir = (r: Resultado) => {
    alElegir(r.lat, r.lng)
    setIrA({ lat: r.lat, lng: r.lng, zoom: 17 })
    setResultados(null)
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          value={texto}
          onChange={e => setTexto(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); buscar() } }}
          aria-label="Buscar una dirección"
          placeholder="Buscar una dirección o un lugar"
          className={campo}
        />
        <button type="button" onClick={buscar} disabled={buscando || !texto.trim()}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-border bg-background text-foreground hover:bg-accent disabled:opacity-60">
          <Search size={13} aria-hidden /> {buscando ? 'Buscando…' : 'Buscar'}
        </button>
      </div>
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
      {resultados && (
        resultados.length === 0
          ? <p role="status" className="text-xs text-muted-foreground">No se encontró esa dirección.</p>
          : (
            <ul aria-label="Direcciones encontradas" className="rounded-xl border border-border divide-y divide-border">
              {resultados.map(r => (
                <li key={`${r.lat},${r.lng}`}>
                  <button type="button" onClick={() => elegir(r)} className="w-full text-left px-3 py-2 text-xs text-foreground hover:bg-accent">{r.nombre}</button>
                </li>
              ))}
            </ul>
          )
      )}
      <Mapa puntos={[]} etiqueta={etiqueta} alto="h-64" centro={centro} punto={punto} irA={irA} alElegir={alElegir} />
      <p className="text-xs text-muted-foreground">
        Toque el mapa para marcar el punto. Búsqueda de direcciones: Nominatim, con datos de © colaboradores de OpenStreetMap.
      </p>
    </div>
  )
}
