import { useState } from 'react'
import * as D from '@radix-ui/react-dialog'
import { cn } from '@/lib/utils'

// Capa de diálogo accesible (Radix): rol dialog con nombre, foco atrapado adentro, Escape cierra,
// el foco vuelve a quien lo abrió y la página de atrás no se desplaza. El panel, el encabezado y
// los botones los pone cada pantalla, como hasta ahora.
export default function Dialogo({
  titulo,
  onCerrar,
  children,
  className,
  fondo = 'bg-black/40 backdrop-blur-sm',
  capa = 'z-50',
  cerrarAlTocarFondo = false,
}: {
  titulo: string
  onCerrar: () => void
  children: React.ReactNode
  /** Para cambiar cómo se ubica el panel (por defecto, centrado con 16 px de margen). */
  className?: string
  fondo?: string
  capa?: string
  cerrarAlTocarFondo?: boolean
}) {
  // Radix devuelve el foco a su Dialog.Trigger; acá cada pantalla abre el diálogo con su propio
  // estado, así que se guarda quién tenía el foco al abrir (primer render) para devolvérselo.
  const [anterior] = useState(() => (typeof document === 'undefined' ? null : document.activeElement as HTMLElement | null))
  return (
    <D.Root open onOpenChange={abierto => { if (!abierto) onCerrar() }}>
      <D.Portal>
        <D.Overlay className={cn('fixed inset-0', capa, fondo)} />
        <D.Content
          aria-describedby={undefined}
          // Al abrir, el foco va al primer campo si hay uno; si no, al primer botón (lo hace Radix).
          onOpenAutoFocus={e => {
            const campo = (e.currentTarget as HTMLElement).querySelector<HTMLElement>(
              'input:not([type=hidden]):not([type=file]):not([disabled]), textarea:not([disabled]), select:not([disabled])',
            )
            if (campo) {
              e.preventDefault()
              campo.focus()
            }
          }}
          onCloseAutoFocus={e => {
            e.preventDefault()
            if (anterior?.isConnected) anterior.focus()
          }}
          onClick={e => { if (cerrarAlTocarFondo && e.target === e.currentTarget) onCerrar() }}
          className={cn('fixed inset-0 flex items-center justify-center p-4 focus:outline-none', capa, className)}
        >
          {/* Nombre del diálogo (aria-labelledby). Oculto: cada pantalla ya muestra su propio título, y
              con sr-only el lector lo leería dos veces al recorrer el diálogo. */}
          <D.Title asChild><span hidden>{titulo}</span></D.Title>
          {children}
        </D.Content>
      </D.Portal>
    </D.Root>
  )
}
