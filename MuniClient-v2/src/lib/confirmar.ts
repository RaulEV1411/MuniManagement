import { create } from 'zustand'

// Confirmación propia en lugar de window.confirm: se ve como el resto, con el foco atrapado y
// devuelto (Dialogo). Uso: if (!(await confirmar({ titulo: '¿Eliminar…?' }))) return
export interface Confirmacion {
  titulo: string
  mensaje?: string
  /** Texto del botón que confirma (por defecto «Eliminar»). */
  accion?: string
  peligro?: boolean
}

interface Pedido extends Confirmacion { resolver: (ok: boolean) => void }

export const usePedidoDeConfirmacion = create<{ pedido: Pedido | null; poner: (p: Pedido | null) => void }>(set => ({
  pedido: null,
  poner: pedido => set({ pedido }),
}))

export function confirmar(opciones: Confirmacion): Promise<boolean> {
  return new Promise(resolver => {
    // Si había otra abierta, se da por cancelada.
    usePedidoDeConfirmacion.getState().pedido?.resolver(false)
    usePedidoDeConfirmacion.getState().poner({ peligro: true, accion: 'Eliminar', ...opciones, resolver })
  })
}
