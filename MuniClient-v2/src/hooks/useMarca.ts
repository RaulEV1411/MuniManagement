import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getConfiguracion } from '@/lib/api'
import { MARCA_POR_DEFECTO, formatearMonto, simboloDe, type Marca } from '@/lib/marca'

// La última marca vista, para pintar con ella desde el primer render y no mostrar un instante los
// colores y el nombre por defecto. Es solo una comodidad: si el navegador no deja guardar, se espera al servidor.
const GUARDADA = 'muni-marca'

function marcaGuardada(): Marca | undefined {
  try {
    const texto = localStorage.getItem(GUARDADA)
    return texto ? { ...MARCA_POR_DEFECTO, ...JSON.parse(texto) } : undefined
  } catch {
    return undefined
  }
}

export function guardarMarca(marca: Marca) {
  try { localStorage.setItem(GUARDADA, JSON.stringify(marca)) } catch { /* sin almacenamiento: no pasa nada */ }
}

/** Nombre, logo, colores, soporte y moneda de la institución (la última conocida, o los valores por defecto, mientras carga). */
export function useMarca(): Marca {
  const { data } = useQuery({ queryKey: ['configuracion'], queryFn: getConfiguracion, staleTime: 5 * 60_000, placeholderData: marcaGuardada })
  return data ?? MARCA_POR_DEFECTO
}

/** Título de la pestaña: «Página · Institución» (WCAG 2.4.2: cada página con su título). */
export function useTituloDePagina(titulo?: string) {
  const { nombre } = useMarca()
  useEffect(() => {
    document.title = titulo ? `${titulo} · ${nombre}` : nombre
  }, [titulo, nombre])
}

/** Moneda de la instalación: su símbolo y cómo mostrar un monto. */
export function useMoneda() {
  const { moneda } = useMarca()
  return { moneda, simbolo: simboloDe(moneda), formatear: (monto: number) => formatearMonto(monto, moneda) }
}
