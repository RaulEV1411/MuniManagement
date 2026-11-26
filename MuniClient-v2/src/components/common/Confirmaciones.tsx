import Dialogo from '@/components/common/Dialogo'
import { usePedidoDeConfirmacion } from '@/lib/confirmar'
import { cn } from '@/lib/utils'

// Muestra las confirmaciones que piden las pantallas con confirmar(). Va una sola vez, en main.tsx.
export default function Confirmaciones() {
  const { pedido, poner } = usePedidoDeConfirmacion()
  if (!pedido) return null
  const responder = (ok: boolean) => {
    poner(null)
    pedido.resolver(ok)
  }
  return (
    <Dialogo titulo={pedido.titulo} onCerrar={() => responder(false)} capa="z-[70]">
      <div className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-2xl p-6">
        <h2 className="text-base font-bold text-foreground">{pedido.titulo}</h2>
        {pedido.mensaje && <p className="mt-2 text-sm text-muted-foreground">{pedido.mensaje}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => responder(false)}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => responder(true)}
            className={cn(
              'px-4 py-2 text-sm font-semibold text-white rounded-xl transition-colors',
              pedido.peligro ? 'bg-red-600 hover:bg-red-700' : 'bg-ocean-500 hover:bg-ocean-600',
            )}
          >
            {pedido.accion}
          </button>
        </div>
      </div>
    </Dialogo>
  )
}
