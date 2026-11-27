import { useEffect, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import codigoDelWorker from 'maplibre-gl/dist/maplibre-gl-worker.mjs?raw'
import 'maplibre-gl/dist/maplibre-gl.css'
import { MapPinOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ESTILO_DEL_MAPA, type PuntoDelMapa, type Vista } from './tipos'
import type { PropsDelMapa } from './Mapa'

// El worker se levanta desde un blob (CSP: worker-src blob:). Servido como archivo, en desarrollo Vite le
// inyecta su cliente de recarga, que deja un websocket abierto en cada worker; así es igual en los dos.
maplibregl.setWorkerUrl(URL.createObjectURL(new Blob([codigoDelWorker], { type: 'text/javascript' })))

// Los textos de los controles, en español (los lee el lector de pantalla).
const TEXTOS = {
  'AttributionControl.ToggleAttribution': 'Mostrar u ocultar la atribución',
  'AttributionControl.MapFeedback': 'Reportar un error del mapa',
  'Map.Title': 'Mapa',
  'Marker.Title': 'Marcador',
  'NavigationControl.ResetBearing': 'Volver al norte',
  'NavigationControl.ZoomIn': 'Acercar',
  'NavigationControl.ZoomOut': 'Alejar',
  'Popup.Close': 'Cerrar',
  'CooperativeGesturesHandler.WindowsHelpText': 'Use Ctrl y la rueda del ratón para acercar o alejar el mapa',
  'CooperativeGesturesHandler.MacHelpText': 'Use ⌘ y la rueda del ratón para acercar o alejar el mapa',
  'CooperativeGesturesHandler.MobileHelpText': 'Use dos dedos para mover el mapa',
}

// Si el estilo no carga en este tiempo, el mapa se da por caído: OpenFreeMap no garantiza servicio.
const ESPERA_MS = 10_000

function hayWebGL(): boolean {
  try {
    const gl = document.createElement('canvas').getContext('webgl2')
    gl?.getExtension('WEBGL_lose_context')?.loseContext()
    return !!gl
  } catch {
    return false
  }
}

function pin(seleccionado = false): HTMLElement {
  const el = document.createElement('span')
  el.className = cn('block h-5 w-5 rounded-full border-[3px] border-white shadow-md', seleccionado ? 'bg-sunset-600' : 'bg-ocean-500')
  return el
}

export default function MapaMapLibre({ puntos, etiqueta, alto = 'h-80', centro, alElegir, punto, irA, alAbrir }: PropsDelMapa) {
  const caja = useRef<HTMLDivElement>(null)
  const mapa = useRef<maplibregl.Map | null>(null)
  // Sin WebGL (o en un navegador viejo) no hay mapa: se avisa desde el principio.
  const [estado, setEstado] = useState<'cargando' | 'listo' | 'caido'>(() => (hayWebGL() ? 'cargando' : 'caido'))
  const sinMapa = estado === 'caido'
  const alElegirRef = useRef(alElegir)
  const alAbrirRef = useRef(alAbrir)
  // Sin un punto ni un centro marcado, la vista sigue a los puntos, también cuando el filtro del portal los cambia.
  const ajustarALosPuntos = useRef(!punto && !centro)
  useEffect(() => { alElegirRef.current = alElegir; alAbrirRef.current = alAbrir })

  // El mapa se crea una vez; los puntos y el punto elegido se actualizan aparte.
  useEffect(() => {
    if (!caja.current || sinMapa) return
    const inicial: Vista = punto ? { ...punto, zoom: 16 } : puntos.length === 1 ? { lat: puntos[0].lat, lng: puntos[0].lng, zoom: 15 }
      : centro ?? { lat: 0, lng: 0, zoom: 1 }
    let m: maplibregl.Map
    try {
      m = new maplibregl.Map({
        container: caja.current,
        style: ESTILO_DEL_MAPA,
        center: [inicial.lng, inicial.lat],
        zoom: inicial.zoom,
        attributionControl: { compact: false },
        locale: TEXTOS,
        cooperativeGestures: !alElegirRef.current,
      })
    } catch {
      // Falló al crearse por otra cosa: el aviso sale en el próximo cuadro (no dentro del efecto).
      const t = window.setTimeout(() => setEstado('caido'))
      return () => window.clearTimeout(t)
    }
    mapa.current = m
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    const espera = window.setTimeout(() => setEstado(e => (e === 'cargando' ? 'caido' : e)), ESPERA_MS)
    m.once('load', () => { window.clearTimeout(espera); setEstado('listo') })
    m.on('error', () => setEstado(e => (e === 'cargando' ? 'caido' : e)))
    m.on('click', e => {
      // wrap: con las copias del mundo a los costados, la longitud del clic puede pasar de ±180.
      const { lat, lng } = e.lngLat.wrap()
      alElegirRef.current?.(Number(lat.toFixed(6)), Number(lng.toFixed(6)))
    })
    return () => {
      window.clearTimeout(espera)
      m.remove()
      mapa.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- la vista inicial se toma al crear el mapa
  }, [])

  // Un marcador por punto: es un botón (se llega con Tab) que abre su burbuja.
  useEffect(() => {
    const m = mapa.current
    if (!m) return
    const marcadores = puntos.map((p: PuntoDelMapa) => {
      const boton = document.createElement('button')
      boton.type = 'button'
      boton.setAttribute('aria-label', p.detalle ? `${p.titulo}: ${p.detalle}` : p.titulo)
      boton.className = 'rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2'
      boton.appendChild(pin())
      const contenido = document.createElement('div')
      contenido.className = 'space-y-1 text-slate-900'
      const titulo = document.createElement('p')
      titulo.className = 'text-sm font-semibold'
      titulo.textContent = p.titulo
      contenido.appendChild(titulo)
      if (p.detalle) {
        const detalle = document.createElement('p')
        detalle.className = 'text-xs text-slate-600'
        detalle.textContent = p.detalle
        contenido.appendChild(detalle)
      }
      if (p.enlace) {
        const enlace = document.createElement('a')
        enlace.href = p.enlace
        enlace.className = 'text-xs font-semibold text-ocean-600 underline underline-offset-2'
        enlace.textContent = 'Ver el proyecto'
        enlace.addEventListener('click', e => {
          if (!alAbrirRef.current) return
          e.preventDefault()
          alAbrirRef.current(p)
        })
        contenido.appendChild(enlace)
      }
      const burbuja = new maplibregl.Popup({ offset: 14, closeButton: true, maxWidth: '260px' }).setDOMContent(contenido)
      return new maplibregl.Marker({ element: boton }).setLngLat([p.lng, p.lat]).setPopup(burbuja).addTo(m)
    })
    if (ajustarALosPuntos.current && puntos.length > 0) {
      const limites = new maplibregl.LngLatBounds()
      puntos.forEach(p => limites.extend([p.lng, p.lat]))
      m.fitBounds(limites, { padding: 48, maxZoom: 15, duration: 0 })
    }
    return () => marcadores.forEach(x => x.remove())
  }, [puntos])

  // El punto que se está eligiendo (ficha del proyecto o centro de la institución).
  useEffect(() => {
    const m = mapa.current
    if (!m || !punto) return
    const el = pin(true)
    el.setAttribute('aria-hidden', 'true')
    const marcador = new maplibregl.Marker({ element: el }).setLngLat([punto.lng, punto.lat]).addTo(m)
    return () => { marcador.remove() }
  }, [punto])

  useEffect(() => {
    if (irA) mapa.current?.flyTo({ center: [irA.lng, irA.lat], zoom: irA.zoom })
  }, [irA])

  return (
    // El mapa es siempre claro: el texto de la atribución no puede heredar el color del tema oscuro.
    <div data-estado={estado} className={cn('relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 text-slate-900', alto)}>
      {/* h-full y no absolute: la hoja de MapLibre le pone position: relative al contenedor. */}
      <div ref={caja} role="region" aria-label={etiqueta} className="h-full w-full" />
      {estado === 'caido' && (
        <div role="status" className="absolute inset-0 grid place-items-center bg-slate-100 p-6 text-center">
          <div className="space-y-2 max-w-xs">
            <MapPinOff className="mx-auto h-6 w-6 text-slate-500" aria-hidden />
            <p className="text-sm font-semibold text-slate-800">El mapa no está disponible en este momento</p>
            <p className="text-xs text-slate-600">{alElegir ? 'Puede escribir la latitud y la longitud a mano.' : 'La información sigue en la lista.'}</p>
          </div>
        </div>
      )}
    </div>
  )
}
