import { lazy, Suspense } from 'react'
import { cn } from '@/lib/utils'
import type { PuntoDelMapa, Vista } from './tipos'

export interface PropsDelMapa {
  puntos: PuntoDelMapa[]
  /** Nombre de la región del mapa para lectores de pantalla. */
  etiqueta: string
  alto?: string
  /** Vista por defecto de la institución, cuando no hay un punto que mostrar. */
  centro?: Vista | null
  /** Modo de elegir: tocar el mapa marca el punto. */
  alElegir?: (lat: number, lng: number) => void
  /** El punto elegido (se marca distinto de los demás). */
  punto?: { lat: number; lng: number } | null
  /** Mover el mapa hasta acá (por ejemplo, al elegir una dirección). */
  irA?: Vista | null
  /** Abrir la página de un punto dentro de la aplicación, sin recargar. */
  alAbrir?: (punto: PuntoDelMapa) => void
}

// MapLibre pesa: se baja solo cuando una pantalla muestra un mapa.
const MapaMapLibre = lazy(() => import('./MapaMapLibre'))

export default function Mapa(props: PropsDelMapa) {
  return (
    <Suspense fallback={<div role="status" aria-label="Cargando el mapa" data-estado="cargando" className={cn('rounded-2xl border border-slate-200 bg-slate-100 animate-pulse', props.alto ?? 'h-80')} />}>
      <MapaMapLibre {...props} />
    </Suspense>
  )
}
