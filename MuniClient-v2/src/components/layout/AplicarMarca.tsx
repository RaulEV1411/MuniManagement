import { useEffect } from 'react'
import { guardarMarca, useMarca } from '@/hooks/useMarca'
import { aplicarMarca } from '@/lib/marca'

// Aplica colores y favicon de la institución a toda la app, apenas llega la configuración.
export default function AplicarMarca() {
  const marca = useMarca()
  useEffect(() => {
    aplicarMarca(marca)
    guardarMarca(marca)
  }, [marca])
  return null
}
