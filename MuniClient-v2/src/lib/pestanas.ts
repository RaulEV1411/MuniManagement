import type { KeyboardEvent } from 'react'

/**
 * Pestañas según WAI-ARIA: Tab entra a la pestaña activa y sale al panel; las flechas, Inicio y
 * Fin cambian de pestaña. Hay un solo panel, con el contenido de la activa.
 */
export function pestanas<T extends string>(grupo: string, todas: readonly T[], activa: T, elegir: (t: T) => void) {
  const id = (t: T) => `${grupo}-pestana-${todas.indexOf(t)}`
  const panel = `${grupo}-panel`
  return {
    lista: { role: 'tablist' as const },
    pestana: (t: T) => ({
      role: 'tab' as const,
      id: id(t),
      'aria-selected': t === activa,
      'aria-controls': panel,
      tabIndex: t === activa ? 0 : -1,
      onClick: () => elegir(t),
      onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
        const i = todas.indexOf(t)
        const destino =
          e.key === 'ArrowRight' ? todas[(i + 1) % todas.length]
          : e.key === 'ArrowLeft' ? todas[(i - 1 + todas.length) % todas.length]
          : e.key === 'Home' ? todas[0]
          : e.key === 'End' ? todas[todas.length - 1]
          : null
        if (!destino) return
        e.preventDefault()
        elegir(destino)
        document.getElementById(id(destino))?.focus()
      },
    }),
    panel: { role: 'tabpanel' as const, id: panel, 'aria-labelledby': id(activa), tabIndex: 0 },
  }
}
