import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { GitBranch, Plus, Pencil, Trash2, Check, X } from 'lucide-react'
import { toast } from 'sonner'
import { getDirections, createDirection, updateDirection, deleteDirection, getUsers } from '@/lib/api'
import { type Direction, type User } from '@/types'
import { mensajeDeError } from '@/lib/errores'
import ErrorDeCarga from '@/components/common/ErrorDeCarga'
import { useTituloDePagina } from '@/hooks/useMarca'
import Dialogo from '@/components/common/Dialogo'

function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName]     = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { toast.error('El nombre es requerido'); return }
    setLoading(true)
    try {
      await createDirection({ name: name.trim() })
      toast.success('Dirección creada')
      onCreated()
      onClose()
    } catch (err) {
      toast.error(mensajeDeError(err, 'Error al crear dirección'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialogo titulo="Nueva dirección" onCerrar={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-2xl"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-bold text-foreground">Nueva dirección</h2>
          <button aria-label="Cerrar" onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground transition-colors">
            <X size={15} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="directions-nombre" className="text-xs font-semibold text-muted-foreground">Nombre <span className="text-destructive">*</span></label>
            <input id="directions-nombre"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ej: Dirección de Obras"
              autoFocus
              className="w-full px-3 py-2 text-sm bg-background border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-muted-foreground hover:bg-accent rounded-xl transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="px-4 py-2 text-sm font-semibold bg-ocean-500 hover:bg-ocean-600 text-white rounded-xl transition-all active:scale-[0.98] disabled:opacity-60">
              {loading ? 'Creando...' : 'Crear'}
            </button>
          </div>
        </form>
      </motion.div>
    </Dialogo>
  )
}

function DirectionRow({ direction, users, onSaved, onDeleted }: {
  direction: Direction
  users: User[]
  onSaved: () => void
  onDeleted: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName]       = useState(direction.name)
  const [jefeId, setJefeId]   = useState(direction.jefe ?? '')
  const jefe = users.find(u => u.user_ID === direction.jefe)
  const nombreJefe = jefe ? `${jefe.first_name} ${jefe.last_name}` : '—'
  const [saving, setSaving]   = useState(false)

  const handleSave = async () => {
    if (!name.trim()) { toast.error('El nombre no puede estar vacío'); return }
    setSaving(true)
    try {
      await updateDirection(direction.direccion_ID, { name: name.trim(), jefe: jefeId || null })
      toast.success('Dirección actualizada')
      onSaved()
      setEditing(false)
    } catch (err) {
      toast.error(mensajeDeError(err, 'Error al actualizar'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm(`¿Eliminar la dirección "${direction.name}"?`)) return
    try {
      await deleteDirection(direction.direccion_ID)
      toast.success('Dirección eliminada')
      onDeleted()
    } catch (err) {
      toast.error(mensajeDeError(err, 'Error al eliminar'))
    }
  }

  const handleCancel = () => {
    setName(direction.name)
    setJefeId(direction.jefe ?? '')
    setEditing(false)
  }

  return (
    <motion.tr
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="border-b border-border last:border-0 group"
    >
      <td className="px-5 py-3.5">
        {editing ? (
          <input aria-label="Nombre de la dirección"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') handleCancel() }}
            autoFocus
            className="w-full px-2.5 py-1.5 text-sm bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        ) : (
          <span className="text-sm text-foreground font-medium">{direction.name}</span>
        )}
      </td>
      <td className="px-5 py-3.5 min-w-0">
        {editing ? (
          <select value={jefeId} onChange={e => setJefeId(e.target.value)} aria-label="Jefe" className="w-full px-2.5 py-1.5 text-sm bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="">Sin jefe</option>
            {users.map(u => <option key={u.user_ID} value={u.user_ID}>{u.first_name} {u.last_name}{u.role?.name ? ` · ${u.role.name}` : ''}</option>)}
          </select>
        ) : (
          <span className="text-sm text-muted-foreground">{nombreJefe}</span>
        )}
      </td>
      <td className="px-5 py-3.5 text-right">
        <div className="flex items-center justify-end gap-1.5">
          {editing ? (
            <>
              <button aria-label="Guardar" onClick={handleSave} disabled={saving}
                className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors disabled:opacity-60">
                <Check size={13} />
              </button>
              <button aria-label="Cancelar" onClick={handleCancel}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent transition-colors">
                <X size={13} />
              </button>
            </>
          ) : (
            <>
              <button aria-label={`Editar ${direction.name}`}
                onClick={() => setEditing(true)}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors opacity-0 group-hover:opacity-100 focus-visible:opacity-100 group-focus-within:opacity-100"
              >
                <Pencil size={13} />
              </button>
              <button aria-label={`Eliminar ${direction.name}`}
                onClick={handleDelete}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100 focus-visible:opacity-100 group-focus-within:opacity-100"
              >
                <Trash2 size={13} />
              </button>
            </>
          )}
        </div>
      </td>
    </motion.tr>
  )
}

export default function DirectionsPage() {
  useTituloDePagina('Direcciones')
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)

  const { data: users = [] } = useQuery<User[]>({ queryKey: ['users'], queryFn: getUsers })
  const { data: directions = [], isLoading, isError, error, refetch } = useQuery<Direction[]>({
    queryKey: ['directions'],
    queryFn: getDirections,
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['directions'] })

  if (isError) return <ErrorDeCarga error={error} onReintentar={refetch} que="las direcciones" />

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ── */}
      <div className="bg-card border-b border-border px-6 flex items-center gap-3 flex-shrink-0" style={{ height: 72 }}>
        <div className="w-9 h-9 rounded-xl bg-ocean-500 flex items-center justify-center flex-shrink-0">
          <GitBranch size={16} className="text-white" />
        </div>
        <div className="flex-1">
          <h1 className="text-base font-bold text-foreground">Direcciones</h1>
          {!isLoading && (
            <p className="text-xs text-muted-foreground">{directions.length} registrada{directions.length !== 1 ? 's' : ''}</p>
          )}
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-ocean-500 hover:bg-ocean-600 text-white text-xs font-semibold rounded-xl transition-all active:scale-[0.98]"
        >
          <Plus size={13} /> Nueva dirección
        </button>
      </div>

      {/* ── Tabla ── */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {isLoading ? (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 border-b border-border last:border-0 animate-pulse bg-muted/30" />
            ))}
          </div>
        ) : directions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
            <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
              <GitBranch size={20} className="text-muted-foreground/40" />
            </div>
            <p className="text-sm font-medium text-foreground">Sin direcciones</p>
            <p className="text-xs text-muted-foreground">Cree la primera dirección para comenzar</p>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-ocean-500 text-white text-xs font-semibold rounded-xl hover:bg-ocean-600 transition-all active:scale-[0.98]"
            >
              <Plus size={12} /> Nueva dirección
            </button>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl overflow-hidden max-w-2xl">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-5 py-3 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Nombre</th>
                  <th className="px-5 py-3 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Jefe</th>
                  <th className="px-5 py-3 text-right text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {directions.map(d => (
                    <DirectionRow
                      key={d.direccion_ID}
                      direction={d}
                      users={users}
                      onSaved={invalidate}
                      onDeleted={invalidate}
                    />
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showCreate && (
          <CreateModal
            onClose={() => setShowCreate(false)}
            onCreated={invalidate}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
