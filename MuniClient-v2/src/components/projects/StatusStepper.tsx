import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Loader2, X } from 'lucide-react'
import type { Estado } from '@/types'

const STATE_ICON: Record<string, string> = {
  'Pendiente': '📋',
  'En progreso': '⚡',
  'En revisión': '👁',
  'Completado': '✅',
  'Pausado': '⏸',
  'Cancelado': '❌',
}

interface Props {
  estados: Estado[]
  currentId: string
  onChange: (nuevoId: string, motivo?: string) => Promise<void> | void
  size?: 'sm' | 'md'
  disabled?: boolean
}

const REQUIERE_MOTIVO = ['Cancelado', 'Pausado']

export default function StatusStepper({ estados, currentId, onChange, size = 'md', disabled }: Props) {
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [confirmando, setConfirmando] = useState<Estado | null>(null)
  const [motivo, setMotivo] = useState('')
  const ordenados = [...estados].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))

  const aplicarCambio = async (estado: Estado, motivoTexto?: string) => {
    if (estado.estado_ID === currentId) return
    setLoadingId(estado.estado_ID)
    try {
      await onChange(estado.estado_ID, motivoTexto)
    } finally {
      setLoadingId(null)
      setConfirmando(null)
      setMotivo('')
    }
  }

  const handleClick = (estado: Estado) => {
    if (disabled || estado.estado_ID === currentId) return
    if (REQUIERE_MOTIVO.includes(estado.name)) {
      setConfirmando(estado)
      return
    }
    aplicarCambio(estado)
  }

  const px = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-sm'

  return (
    <>
      <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label="Cambiar estado">
        {ordenados.map(estado => {
          const active = estado.estado_ID === currentId
          const cargando = loadingId === estado.estado_ID
          const color = estado.color ?? '#64748b'
          return (
            <motion.button
              key={estado.estado_ID}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled || cargando || active}
              onClick={() => handleClick(estado)}
              whileTap={{ scale: 0.96 }}
              className={`group inline-flex items-center gap-1.5 rounded-full border font-medium transition ${px} ${
                active
                  ? 'text-white border-transparent shadow-md'
                  : 'border-border bg-card text-foreground hover:border-foreground/30 hover:bg-accent'
              } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
              style={active ? { backgroundColor: color } : undefined}
              title={`Cambiar a ${estado.name}`}
            >
              <span aria-hidden>{STATE_ICON[estado.name] ?? '•'}</span>
              <span>{estado.name}</span>
              {cargando && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {active && !cargando && <Check className="h-3.5 w-3.5" />}
            </motion.button>
          )
        })}
      </div>

      {confirmando && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={() => setConfirmando(null)}>
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-lg font-semibold text-foreground">
                Cambiar a "{confirmando.name}"
              </h3>
              <button onClick={() => setConfirmando(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Esta acción quedará registrada en el historial. Por favor indica el motivo.
            </p>
            <textarea
              autoFocus
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              rows={3}
              placeholder="Motivo del cambio…"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setConfirmando(null)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent"
              >
                Cancelar
              </button>
              <button
                disabled={!motivo.trim() || loadingId !== null}
                onClick={() => aplicarCambio(confirmando, motivo.trim())}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                Confirmar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  )
}
