import { useEffect, useState } from 'react'

/** El valor, pero recién cuando deja de cambiar durante `ms` (p. ej. mientras se escribe). */
export function useValorDiferido<T>(valor: T, ms = 350): T {
  const [diferido, setDiferido] = useState(valor)
  useEffect(() => {
    const id = setTimeout(() => setDiferido(valor), ms)
    return () => clearTimeout(id)
  }, [valor, ms])
  return diferido
}
