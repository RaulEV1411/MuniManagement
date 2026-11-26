import { Fragment } from 'react'
import type { CambioAuditoria } from '@/types'

function valorLegible(valor: unknown): string {
  if (valor === null || valor === undefined || valor === '') return 'vacío'
  if (typeof valor === 'boolean') return valor ? 'Sí' : 'No'
  if (typeof valor === 'object') return JSON.stringify(valor)
  return String(valor)
}

/** El antes y el después de cada campo que cambió. */
export default function Cambios({ detalle }: { detalle: CambioAuditoria[] }) {
  if (!detalle.length) return null
  return (
    <dl className="grid grid-cols-[minmax(110px,auto)_1fr] gap-x-4 gap-y-1.5 text-xs">
      {detalle.map(c => (
        <Fragment key={c.campo}>
          <dt className="font-semibold text-muted-foreground">{c.etiqueta}</dt>
          <dd className="text-foreground break-words">
            <span className="line-through decoration-muted-foreground/60 text-muted-foreground">{valorLegible(c.antes)}</span>
            <span aria-hidden="true"> → </span>
            <span className="sr-only"> pasó a </span>
            <span className="font-medium">{valorLegible(c.despues)}</span>
          </dd>
        </Fragment>
      ))}
    </dl>
  )
}
