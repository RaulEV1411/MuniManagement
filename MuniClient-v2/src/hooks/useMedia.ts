import { useCallback, useSyncExternalStore } from 'react'

/** Si la consulta de medios se cumple ahora; se actualiza al cambiar el tamaño de la ventana. */
export function useMedia(consulta: string): boolean {
  const suscribir = useCallback((avisar: () => void) => {
    const m = window.matchMedia(consulta)
    m.addEventListener('change', avisar)
    return () => m.removeEventListener('change', avisar)
  }, [consulta])
  return useSyncExternalStore(
    suscribir,
    () => window.matchMedia(consulta).matches,
    () => false,
  )
}
