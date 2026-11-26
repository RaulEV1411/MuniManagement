import { useState } from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'

export default function RazonModal({
  title, description, onConfirm, onClose,
}: {
  title: string
  description?: string
  onConfirm: (razon: string) => void
  onClose: () => void
}) {
  const [razon, setRazon] = useState('')
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-bold text-foreground">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground transition-colors">
            <X size={15} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Motivo *</label>
            <textarea
              value={razon}
              onChange={e => setRazon(e.target.value)}
              rows={3}
              placeholder="Describa el motivo de este cambio…"
              className="w-full px-3 py-2 text-sm bg-background border border-input rounded-xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-muted-foreground hover:bg-accent rounded-xl transition-colors">
              Cancelar
            </button>
            <button
              type="button"
              disabled={!razon.trim()}
              onClick={() => onConfirm(razon.trim())}
              className="px-4 py-2 text-sm font-semibold bg-ocean-500 hover:bg-ocean-600 text-white rounded-xl transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Confirmar
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
