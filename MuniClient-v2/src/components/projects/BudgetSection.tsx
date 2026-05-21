import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Plus, TrendingDown, TrendingUp, X } from 'lucide-react'
import { toast } from 'sonner'
import { getAjustes, createAjuste } from '@/lib/api'
import type { AjustePresupuesto } from '@/types'

interface Props {
  proyectoId?: string
  tareaId?: string
  costoBase: number
  compact?: boolean
}

const colones = (n: number) => `₡${n.toLocaleString('es-CR')}`

export default function BudgetSection({ proyectoId, tareaId, costoBase, compact }: Props) {
  const qc = useQueryClient()
  const queryKey = ['ajustes', proyectoId ?? '', tareaId ?? '']
  const { data: ajustes = [] } = useQuery<AjustePresupuesto[]>({
    queryKey,
    queryFn: () => getAjustes(proyectoId ? { proyecto_ID: proyectoId } : { tarea_ID: tareaId }),
  })
  const [open, setOpen] = useState(false)
  const [tipo, setTipo] = useState<'aumento' | 'rebajo'>('aumento')
  const [monto, setMonto] = useState('')
  const [motivo, setMotivo] = useState('')

  const crear = useMutation({
    mutationFn: () =>
      createAjuste({
        proyecto: proyectoId ?? null,
        tarea: tareaId ?? null,
        tipo,
        monto: Number(monto),
        motivo,
      }),
    onSuccess: () => {
      toast.success('Ajuste registrado')
      qc.invalidateQueries({ queryKey })
      qc.invalidateQueries({ queryKey: ['project', proyectoId] })
      qc.invalidateQueries({ queryKey: ['projects'] })
      setOpen(false)
      setMonto('')
      setMotivo('')
    },
    onError: () => toast.error('No se pudo registrar el ajuste'),
  })

  const delta = ajustes.reduce(
    (acc, a) => acc + (a.tipo === 'aumento' ? a.monto : -a.monto),
    0,
  )
  const total = costoBase + delta

  return (
    <section className={`rounded-2xl border border-border bg-card ${compact ? 'p-3' : 'p-5'}`}>
      <header className="flex items-center justify-between mb-3">
        <div>
          <h3 className={`font-semibold text-foreground ${compact ? 'text-sm' : 'text-base'}`}>Presupuesto</h3>
          <p className="text-xs text-muted-foreground">
            Base {colones(costoBase)} · Total actual <strong className="text-foreground">{colones(total)}</strong>
          </p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
        >
          <Plus className="h-3.5 w-3.5" /> Ajuste
        </button>
      </header>

      {ajustes.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">Sin ajustes registrados.</p>
      ) : (
        <ul className="space-y-1.5">
          {ajustes.map(a => (
            <li
              key={a.ajuste_ID}
              className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-background px-3 py-2 text-sm"
            >
              <span className="flex items-center gap-2">
                {a.tipo === 'aumento' ? (
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
                <span className={a.tipo === 'aumento' ? 'text-emerald-700' : 'text-red-700'}>
                  {a.tipo === 'aumento' ? '+' : '−'}{colones(a.monto)}
                </span>
              </span>
              <span className="flex-1 text-xs text-muted-foreground truncate">{a.motivo}</span>
              <span className="text-xs text-muted-foreground">
                {a.usuario_info ? `${a.usuario_info.first_name} ${a.usuario_info.last_name}` : ''}
              </span>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={() => setOpen(false)}>
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl"
          >
            <header className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Nuevo ajuste de presupuesto</h3>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                onClick={() => setTipo('aumento')}
                className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                  tipo === 'aumento'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10'
                    : 'border-border bg-background hover:bg-accent'
                }`}
              >
                <TrendingUp className="inline h-4 w-4 mr-1" /> Aumento
              </button>
              <button
                onClick={() => setTipo('rebajo')}
                className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                  tipo === 'rebajo'
                    ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-500/10'
                    : 'border-border bg-background hover:bg-accent'
                }`}
              >
                <TrendingDown className="inline h-4 w-4 mr-1" /> Rebajo
              </button>
            </div>

            <label className="block text-sm font-medium text-foreground mb-1">Monto (₡)</label>
            <input
              type="number"
              min={1}
              value={monto}
              onChange={e => setMonto(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary mb-3"
            />

            <label className="block text-sm font-medium text-foreground mb-1">Motivo</label>
            <textarea
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />

            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setOpen(false)} className="rounded-lg px-4 py-2 text-sm font-medium hover:bg-accent">
                Cancelar
              </button>
              <button
                disabled={!monto || !motivo.trim() || crear.isPending}
                onClick={() => crear.mutate()}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {crear.isPending ? 'Guardando…' : 'Registrar'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </section>
  )
}
