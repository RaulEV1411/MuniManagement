import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const ANCHO = 288
// Uno a la vez: abrir un tooltip cierra el que estaba abierto (p. ej., el de la fila que quedó bajo el puntero
// mientras el foco pasa a otra).
let cerrarElAbierto: (() => void) | null = null

/** Tooltip accesible (WCAG 1.4.13): se abre al pasar el puntero o con el foco, se cierra con Escape o al salir,
 * y se puede recorrer con el puntero sin que desaparezca. Va en un portal con posición fija, así no lo recorta
 * el scroll del contenedor. El texto queda en el DOM aunque esté oculto: lo lee aria-describedby.
 * - `ancla`: el elemento junto al que se ubica;
 * - `disparador`: en el elemento que recibe el puntero y el foco (o en uno que los contenga);
 * - `describe`: en el elemento que recibe el foco. */
export function useTooltip<T extends HTMLElement = HTMLElement>() {
  const id = useId()
  // El ancla va en estado (ref de callback) y el temporizador solo se toca en los manejadores:
  // lo que devuelve el hook no lleva refs, así se puede usar al renderizar.
  const [ancla, setAncla] = useState<T | null>(null)
  const [estilo, setEstilo] = useState<React.CSSProperties | null>(null)
  const espera = useRef<number | undefined>(undefined)

  const ubicar = useCallback(() => {
    const r = ancla?.getBoundingClientRect()
    if (!r) return
    const left = Math.max(8, Math.min(r.left, window.innerWidth - ANCHO - 8))
    // Abajo si hay lugar; si no, hacia donde haya más. El alto se limita al espacio, así nunca queda cortado.
    const abajo = window.innerHeight - r.bottom
    const haciaArriba = abajo < 300 && r.top > abajo
    setEstilo(haciaArriba
      ? { left, bottom: window.innerHeight - r.top + 6, maxHeight: r.top - 14 }
      : { left, top: r.bottom + 6, maxHeight: abajo - 14 })
  }, [ancla])
  const cancelar = useCallback(() => window.clearTimeout(espera.current), [])
  const cerrar = useCallback(() => {
    window.clearTimeout(espera.current)
    setEstilo(null)
  }, [])
  const mostrar = useCallback(() => {
    window.clearTimeout(espera.current)
    if (cerrarElAbierto !== cerrar) cerrarElAbierto?.()
    cerrarElAbierto = cerrar
    ubicar()
  }, [ubicar, cerrar])
  const ocultar = useCallback(() => {
    window.clearTimeout(espera.current)
    espera.current = window.setTimeout(() => setEstilo(null), 120)
  }, [])

  const abierto = estilo !== null
  useEffect(() => {
    if (!abierto) return
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') setEstilo(null) }
    // Al desplazar (también el que hace el navegador al pasar el foco) se reubica en vez de cerrarse.
    document.addEventListener('keydown', tecla)
    window.addEventListener('scroll', ubicar, true)
    window.addEventListener('resize', ubicar)
    return () => {
      document.removeEventListener('keydown', tecla)
      window.removeEventListener('scroll', ubicar, true)
      window.removeEventListener('resize', ubicar)
    }
  }, [abierto, ubicar])
  useEffect(() => () => {
    window.clearTimeout(espera.current)
    if (cerrarElAbierto === cerrar) cerrarElAbierto = null
  }, [cerrar])

  return {
    ancla: setAncla,
    disparador: { onMouseEnter: mostrar, onMouseLeave: ocultar, onFocus: mostrar, onBlur: ocultar },
    describe: { 'aria-describedby': id },
    burbuja: (contenido: React.ReactNode) => createPortal(
      <div id={id} role="tooltip" hidden={!abierto} style={estilo ?? undefined}
        onMouseEnter={cancelar} onMouseLeave={ocultar}
        className="fixed z-50 w-72 overflow-auto rounded-xl border border-border bg-card p-3 text-xs text-foreground shadow-xl">
        {contenido}
      </div>,
      document.body,
    ),
  }
}
