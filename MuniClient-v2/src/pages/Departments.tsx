import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Building2, Plus, Pencil, Trash2, Check, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  getDepartments, createDepartment, updateDepartment, deleteDepartment, getDirections,
} from '@/lib/api'
import { type Department, type Direction } from '@/types'

function CreateModal({
  directions,
  onClose,
  onCreated,
}: {
  directions: Direction[]
  onClose: () => void
  onCreated: () => void
}) {
  const [name, setName]         = useState('')
  const [dirId, setDirId]       = useState('')
  const [loading, setLoading]   = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { toast.error('El nombre es requerido'); return }
    setLoading(true)
    try {
      await createDepartment({ name: name.trim(), direccion: dirId || undefined })
      toast.success('Departamento creado')
      onCreated()
      onClose()
    } catch {
      toast.error('Error al crear departamento')
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'w-full px-3 py-2 text-sm bg-background border border-input rounded-xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-2xl"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-bold text-foreground">Nuevo departamento</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground transition-colors">
            <X size={15} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Nombre <span className="text-destructive">*</span></label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ej: Departamento de Proyectos"
              autoFocus
              className={inputCls}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Dirección</label>
            <select value={dirId} onChange={e => setDirId(e.target.value)} className={inputCls}>
              <option value="">Sin dirección</option>
              {directions.map(d => <option key={d.direccion_ID} value={d.direccion_ID}>{d.name}</option>)}
            </select>
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
    </div>
  )
}

function DepartmentRow({
  dept,
  directions,
  onSaved,
  onDeleted,
}: {
  dept: Department
  directions: Direction[]
  onSaved: () => void
  onDeleted: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName]       = useState(dept.name)
  const [dirId, setDirId]     = useState<string>(
    typeof dept.direccion === 'string' ? dept.direccion : (dept.direccion as Direction | null)?.direccion_ID ?? ''
  )
  const [saving, setSaving]   = useState(false)

  const dirName = directions.find(d => d.direccion_ID === dirId)?.name ?? '—'

  const handleSave = async () => {
    if (!name.trim()) { toast.error('El nombre no puede estar vacío'); return }
    setSaving(true)
    try {
      await updateDepartment(dept.departamentos_ID, { name: name.trim(), direccion: dirId || undefined })
      toast.success('Departamento actualizado')
      onSaved()
      setEditing(false)
    } catch {
      toast.error('Error al actualizar')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setName(dept.name)
    setDirId(typeof dept.direccion === 'string' ? dept.direccion : (dept.direccion as Direction | null)?.direccion_ID ?? '')
    setEditing(false)
  }

  const handleDelete = async () => {
    if (!window.confirm(`¿Eliminar el departamento "${dept.name}"?`)) return
    try {
      await deleteDepartment(dept.departamentos_ID)
      toast.success('Departamento eliminado')
      onDeleted()
    } catch {
      toast.error('Error al eliminar')
    }
  }

  const cellInput = 'w-full px-2.5 py-1.5 text-sm bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring'

  return (
    <motion.tr
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="border-b border-border last:border-0"
    >
      <td className="px-5 py-3.5 min-w-0">
        {editing ? (
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Escape') handleCancel() }}
            autoFocus
            className={cellInput}
          />
        ) : (
          <span className="text-sm text-foreground font-medium">{dept.name}</span>
        )}
      </td>
      <td className="px-5 py-3.5 min-w-0">
        {editing ? (
          <select value={dirId} onChange={e => setDirId(e.target.value)} className={cellInput}>
            <option value="">Sin dirección</option>
            {directions.map(d => <option key={d.direccion_ID} value={d.direccion_ID}>{d.name}</option>)}
          </select>
        ) : (
          <span className="text-sm text-muted-foreground">{dirName}</span>
        )}
      </td>
      <td className="px-5 py-3.5 text-right">
        <div className="flex items-center justify-end gap-1.5">
          {editing ? (
            <>
              <button onClick={handleSave} disabled={saving}
                className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors disabled:opacity-60">
                <Check size={13} />
              </button>
              <button onClick={handleCancel}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent transition-colors">
                <X size={13} />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setEditing(true)}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              >
                <Pencil size={13} />
              </button>
              <button
                onClick={handleDelete}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
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

export default function DepartmentsPage() {
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)

  const { data: departments = [], isLoading } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: getDepartments,
  })

  const { data: directions = [] } = useQuery<Direction[]>({
    queryKey: ['directions'],
    queryFn: getDirections,
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['departments'] })

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ── */}
      <div className="bg-card border-b border-border px-6 flex items-center gap-3 flex-shrink-0" style={{ height: 72 }}>
        <div className="w-9 h-9 rounded-xl bg-ocean-500 flex items-center justify-center flex-shrink-0">
          <Building2 size={16} className="text-white" />
        </div>
        <div className="flex-1">
          <h1 className="text-base font-bold text-foreground">Departamentos</h1>
          {!isLoading && (
            <p className="text-xs text-muted-foreground">{departments.length} registrado{departments.length !== 1 ? 's' : ''}</p>
          )}
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-ocean-500 hover:bg-ocean-600 text-white text-xs font-semibold rounded-xl transition-all active:scale-[0.98]"
        >
          <Plus size={13} /> Nuevo departamento
        </button>
      </div>

      {/* ── Tabla ── */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {isLoading ? (
          <div className="bg-card border border-border rounded-2xl overflow-hidden max-w-2xl">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 border-b border-border last:border-0 animate-pulse bg-muted/30" />
            ))}
          </div>
        ) : departments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
            <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
              <Building2 size={20} className="text-muted-foreground/40" />
            </div>
            <p className="text-sm font-medium text-foreground">Sin departamentos</p>
            <p className="text-xs text-muted-foreground">Crea el primer departamento para comenzar</p>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-ocean-500 text-white text-xs font-semibold rounded-xl hover:bg-ocean-600 transition-all active:scale-[0.98]"
            >
              <Plus size={12} /> Nuevo departamento
            </button>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl overflow-hidden max-w-2xl">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-5 py-3 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Nombre</th>
                  <th className="px-5 py-3 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Dirección</th>
                  <th className="px-5 py-3 text-right text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {departments.map(d => (
                    <DepartmentRow
                      key={d.departamentos_ID}
                      dept={d}
                      directions={directions}
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
            directions={directions}
            onClose={() => setShowCreate(false)}
            onCreated={invalidate}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
