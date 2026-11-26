import { AlertTriangle, RotateCw } from 'lucide-react'
import { mensajeDeError } from '@/lib/errores'

// Para cuando la consulta principal de una pantalla falla: dice qué pasó y deja reintentar,
// en lugar de mostrar «Sin resultados» o «No encontrado».
export default function ErrorDeCarga({
  error,
  onReintentar,
  que = 'la información',
}: {
  error: unknown
  onReintentar?: () => void
  que?: string
}) {
  return (
    <div role="alert" className="m-6 rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center space-y-3">
      <AlertTriangle className="mx-auto h-6 w-6 text-destructive" aria-hidden="true" />
      <p className="text-sm font-semibold text-foreground">No se pudo cargar {que}.</p>
      <p className="text-xs text-muted-foreground">{mensajeDeError(error, 'Inténtelo de nuevo en unos minutos.')}</p>
      {onReintentar && (
        <button
          onClick={() => onReintentar()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-ocean-500 hover:bg-ocean-600 text-white"
        >
          <RotateCw size={12} aria-hidden="true" /> Reintentar
        </button>
      )}
    </div>
  )
}
