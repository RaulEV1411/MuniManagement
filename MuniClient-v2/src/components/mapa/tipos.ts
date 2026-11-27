// Tipos y ajustes del mapa, aparte de MapLibre (que se carga solo donde hay un mapa).

export interface PuntoDelMapa {
  id: string
  lat: number
  lng: number
  titulo: string
  /** Una línea más en la burbuja (estado, departamento…). */
  detalle?: string
  /** Página del punto: la burbuja ofrece «Ver el proyecto». */
  enlace?: string
}

export interface Vista {
  lat: number
  lng: number
  zoom: number
}

// Estilo de OpenFreeMap: gratuito, sin clave ni límite de vistas, con datos de OpenStreetMap. Otra instalación
// (teselas propias o de un proveedor) lo cambia con VITE_MAPA_ESTILO y el origen en la CSP (MAPA_ORIGEN).
export const ESTILO_DEL_MAPA: string = import.meta.env.VITE_MAPA_ESTILO || 'https://tiles.openfreemap.org/styles/liberty'

// Búsqueda de direcciones: Nominatim (política de uso: una búsqueda por pedido, como máximo una por segundo,
// con atribución). Se cambia con VITE_BUSQUEDA_DIRECCIONES y BUSQUEDA_ORIGEN en la CSP.
export const BUSQUEDA_DE_DIRECCIONES: string =
  import.meta.env.VITE_BUSQUEDA_DIRECCIONES || 'https://nominatim.openstreetmap.org/search'

/** Lo escrito a mano en latitud y longitud, si es un punto posible: fuera de ±90 y ±180, MapLibre lanza un error. */
export function puntoEscrito(lat: string, lng: string): { lat: number; lng: number } | null {
  if (lat.trim() === '' || lng.trim() === '') return null
  const la = Number(lat), lo = Number(lng)
  return Number.isFinite(la) && Number.isFinite(lo) && Math.abs(la) <= 90 && Math.abs(lo) <= 180 ? { lat: la, lng: lo } : null
}

/** El centro que el Administrador marcó en Configuración, si hay. */
export function centroDeLaInstitucion(marca: { mapa_latitud: string | null; mapa_longitud: string | null; mapa_zoom: number }): Vista | null {
  if (marca.mapa_latitud == null || marca.mapa_longitud == null) return null
  return { lat: Number(marca.mapa_latitud), lng: Number(marca.mapa_longitud), zoom: marca.mapa_zoom }
}
