import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, Columns3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMedia } from '@/hooks/useMedia'

export interface Columna<T> {
  id: string
  titulo: string
  celda: (fila: T) => React.ReactNode
  /** Clave de orden del servidor (`clave` y `-clave`); sin ella, la columna no ordena. */
  orden?: string
  derecha?: boolean
  /** No se puede ocultar. */
  fija?: boolean
  /** Arranca oculta; se muestra desde «Columnas». */
  oculta?: boolean
  /** El primer clic ordena al revés (fechas: lo más reciente primero). */
  primero?: 'desc'
  /** Texto largo: se parte en líneas dentro de ese ancho (las demás columnas no se parten). */
  ancho?: string
}

const leer = (clave: string): string[] | null => {
  try {
    const crudo = localStorage.getItem(clave)
    return crudo ? JSON.parse(crudo) : null
  } catch {
    return null
  }
}

/** Lista en tabla: encabezado fijo, orden por columna (en el servidor), columnas a elección y, debajo de
 * `lg`, una tarjeta por fila. Las columnas elegidas se guardan en este navegador. */
export default function TablaDeDatos<T>({ id, titulo, columnas, filas, clave, orden, onOrden, tarjeta }: {
  id: string
  titulo: string
  columnas: Columna<T>[]
  filas: T[]
  clave: (fila: T) => string
  orden: string
  onOrden: (orden: string) => void
  tarjeta: (fila: T) => React.ReactNode
}) {
  const guardadas = `tabla:${id}:ocultas`
  const [ocultas, setOcultas] = useState<string[]>(() => leer(guardadas) ?? columnas.filter(c => c.oculta).map(c => c.id))
  const visibles = columnas.filter(c => c.fija || !ocultas.includes(c.id))
  const ancha = useMedia('(min-width: 1024px)')
  const [menu, setMenu] = useState(false)
  const caja = useRef<HTMLDivElement>(null)
  const boton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!menu) return
    const afuera = (e: MouseEvent) => { if (!caja.current?.contains(e.target as Node)) setMenu(false) }
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') { setMenu(false); boton.current?.focus() } }
    document.addEventListener('mousedown', afuera)
    document.addEventListener('keydown', tecla)
    return () => {
      document.removeEventListener('mousedown', afuera)
      document.removeEventListener('keydown', tecla)
    }
  }, [menu])

  const alternar = (colId: string) => setOcultas(antes => {
    const nuevas = antes.includes(colId) ? antes.filter(x => x !== colId) : [...antes, colId]
    try { localStorage.setItem(guardadas, JSON.stringify(nuevas)) } catch { /* sin almacenamiento: vale para esta visita */ }
    return nuevas
  })

  if (!ancha) {
    return (
      <ul className="bg-card rounded-2xl border border-border overflow-hidden" aria-label={titulo}>
        {filas.map(f => <li key={clave(f)} className="border-b border-border last:border-0">{tarjeta(f)}</li>)}
      </ul>
    )
  }

  return (
      <div className="space-y-2">
        <div className="flex justify-end">
          <div ref={caja} className="relative">
            <button ref={boton} type="button" aria-expanded={menu} aria-controls={`${id}-columnas`} onClick={() => setMenu(m => !m)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border border-border rounded-xl bg-background text-foreground hover:bg-accent">
              <Columns3 size={13} aria-hidden /> Columnas
            </button>
            <fieldset id={`${id}-columnas`} hidden={!menu} className="absolute right-0 z-40 mt-1 w-56 rounded-xl border border-border bg-card p-3 shadow-lg space-y-1.5">
              <legend className="sr-only">Columnas visibles</legend>
              {columnas.filter(c => !c.fija).map(c => (
                <label key={c.id} className="flex items-center gap-2 text-sm text-foreground">
                  <input type="checkbox" checked={!ocultas.includes(c.id)} onChange={() => alternar(c.id)} className="h-4 w-4 accent-ocean-500" />
                  {c.titulo}
                </label>
              ))}
            </fieldset>
          </div>
        </div>
        {/* Scroll propio en los dos ejes: el encabezado queda fijo y las columnas que no caben se ven
            deslizando. Los menús de una celda se abren fuera (en un portal) para no recortarse. */}
        <div className="max-h-[calc(100dvh-19rem)] min-h-56 overflow-auto rounded-2xl border border-border bg-card">
          {/* border-separate: con collapse (el de Tailwind) el redondeo de las esquinas no se aplica a las celdas. */}
          <table className="w-full text-sm border-separate border-spacing-0">
            <caption className="sr-only">{titulo}</caption>
            <thead>
              <tr>
                {visibles.map(c => {
                  const sentido = c.orden && orden === c.orden ? 'ascending' : c.orden && orden === `-${c.orden}` ? 'descending' : undefined
                  const Icono = sentido === 'ascending' ? ArrowUp : sentido === 'descending' ? ArrowDown : ArrowUpDown
                  return (
                    <th key={c.id} scope="col" aria-sort={sentido}
                      className={cn('sticky top-0 z-20 bg-muted px-3 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap border-b border-border first:rounded-tl-2xl last:rounded-tr-2xl',
                        c.derecha ? 'text-right' : 'text-left')}>
                      {c.orden ? (
                        <button type="button"
                          onClick={() => onOrden(sentido === 'ascending' || (!sentido && c.primero === 'desc') ? `-${c.orden}` : c.orden!)}
                          className={cn('inline-flex items-center gap-1 hover:text-foreground', sentido && 'text-foreground', c.derecha && 'flex-row-reverse')}>
                          {c.titulo}
                          <Icono size={12} aria-hidden className={sentido ? '' : 'opacity-40'} />
                        </button>
                      ) : c.titulo}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {filas.map(f => (
                <tr key={clave(f)} className="group">
                  {visibles.map(c => (
                    <td key={c.id} className={cn('px-3 py-2.5 align-middle border-b border-border group-last:border-0 group-hover:bg-accent/40 group-last:first:rounded-bl-2xl group-last:last:rounded-br-2xl',
                      c.ancho ?? 'whitespace-nowrap', c.derecha && 'text-right tabular-nums')}>{c.celda(f)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
  )
}

/** Selector de filas por página, al lado del paginador. */
export function TamanoDePagina({ valor, onCambio, etiqueta, opciones = [25, 50, 100] }: {
  valor: number
  onCambio: (n: number) => void
  etiqueta: string
  opciones?: number[]
}) {
  return (
    <label className="inline-flex items-center gap-1.5">
      <span>{etiqueta}</span>
      <select value={valor} onChange={e => onCambio(Number(e.target.value))}
        className="px-2 py-1 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
        {opciones.map(n => <option key={n} value={n}>{n}</option>)}
      </select>
    </label>
  )
}
