import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Sliders, Pencil, Trash2, Plus, Check, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  getEstados,    createEstado,    updateEstado,    deleteEstado,
  getPrioridades, createPrioridad, updatePrioridad, deletePrioridad,
  getTipos,      createTipo,      updateTipo,      deleteTipo,
} from '@/lib/api'
import { type Estado, type Prioridad, type Tipo } from '@/types'
import { cn } from '@/lib/utils'

const TABS = ['Estados', 'Prioridades', 'Tipos'] as const
type Tab = typeof TABS[number]

// ── Fila editable genérica ─────────────────────────────────────────────────
interface GenericItem { id: string; name: string; isSystem?: boolean; color?: string }

function ItemRow({
  item,
  onSave,
  onDelete,
}: {
  item: GenericItem
  onSave: (id: string, name: string) => Promise<void>
  onDelete: (id: string, name: string) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName]       = useState(item.name)
  const [saving, setSaving]   = useState(false)

  const handleSave = async () => {
    if (!name.trim()) { toast.error('El nombre no puede estar vacío'); return }
    setSaving(true)
    try {
      await onSave(item.id, name.trim())
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setName(item.name)
    setEditing(false)
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -10 }}
      className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 group"
    >
      {editing ? (
        <>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') handleCancel() }}
            autoFocus
            className="flex-1 px-2.5 py-1.5 text-sm bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button onClick={handleSave} disabled={saving}
            className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors flex-shrink-0 disabled:opacity-60">
            <Check size={13} />
          </button>
          <button onClick={handleCancel}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent transition-colors flex-shrink-0">
            <X size={13} />
          </button>
        </>
      ) : (
        <>
          {item.color && (
            <span
              aria-hidden
              className="h-3 w-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: item.color }}
            />
          )}
          <span className="flex-1 text-sm font-medium text-foreground">{item.name}</span>
          {item.isSystem ? (
            <span
              title="Definido por el sistema. No se puede modificar."
              className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full flex-shrink-0"
            >
              Sistema
            </span>
          ) : (
            <div className="flex items-center gap-1.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => setEditing(true)}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              >
                <Pencil size={13} />
              </button>
              <button
                onClick={() => onDelete(item.id, item.name)}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
              >
                <Trash2 size={13} />
              </button>
            </div>
          )}
        </>
      )}
    </motion.div>
  )
}

// ── Sección CRUD genérica ──────────────────────────────────────────────────
function CrudSection({
  items,
  isLoading,
  emptyLabel,
  onSave,
  onDelete,
  onCreate,
  readOnly,
  readOnlyMessage,
}: {
  items: GenericItem[]
  isLoading: boolean
  emptyLabel: string
  onSave: (id: string, name: string) => Promise<void>
  onDelete: (id: string, name: string) => Promise<void>
  onCreate: (name: string) => Promise<void>
  readOnly?: boolean
  readOnlyMessage?: string
}) {
  const [newName, setNewName]   = useState('')
  const [creating, setCreating] = useState(false)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) { toast.error('El nombre es requerido'); return }
    setCreating(true)
    try {
      await onCreate(newName.trim())
      setNewName('')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-4 max-w-lg">
      {readOnly ? (
        <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          {readOnlyMessage ?? 'Estos registros son definidos por el sistema y no pueden modificarse.'}
        </div>
      ) : (
        <form onSubmit={handleCreate} className="flex gap-2">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder={`Nuevo ${emptyLabel.toLowerCase()}...`}
            className="flex-1 px-3 py-2 text-sm bg-background border border-input rounded-xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit"
            disabled={creating || !newName.trim()}
            className="flex items-center gap-1.5 px-4 py-2 bg-ocean-500 hover:bg-ocean-600 text-white text-xs font-semibold rounded-xl transition-all active:scale-[0.98] flex-shrink-0 disabled:opacity-60"
          >
            <Plus size={13} /> Crear
          </button>
        </form>
      )}

      {/* Lista */}
      {isLoading ? (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-12 border-b border-border last:border-0 animate-pulse bg-muted/30" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2 text-center bg-card border border-border rounded-2xl">
          <p className="text-sm text-muted-foreground">No hay {emptyLabel.toLowerCase()}s registrado{emptyLabel.toLowerCase().endsWith('o') ? 's' : 's'}</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <AnimatePresence>
            {items.map(item => (
              <ItemRow key={item.id} item={item} onSave={onSave} onDelete={onDelete} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

export default function ConfigPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('Estados')

  const { data: estados = [],     isLoading: loadingEstados }     = useQuery<Estado[]>({ queryKey: ['estados'],     queryFn: getEstados })
  const { data: prioridades = [], isLoading: loadingPrioridades } = useQuery<Prioridad[]>({ queryKey: ['prioridades'], queryFn: getPrioridades })
  const { data: tipos = [],       isLoading: loadingTipos }       = useQuery<Tipo[]>({ queryKey: ['tipos'],       queryFn: getTipos })

  // ── Estados ──
  const estadoItems: GenericItem[] = estados.map(e => ({
    id: e.estado_ID,
    name: e.name,
    color: e.color,
    isSystem: e.is_system,
  }))
  const onSaveEstado  = async (id: string, name: string) => {
    await updateEstado(id, { name })
    qc.invalidateQueries({ queryKey: ['estados'] })
    toast.success('Estado actualizado')
  }
  const onDeleteEstado = async (id: string, name: string) => {
    if (!window.confirm(`¿Eliminar el estado "${name}"?`)) return
    await deleteEstado(id)
    qc.invalidateQueries({ queryKey: ['estados'] })
    toast.success('Estado eliminado')
  }
  const onCreateEstado = async (name: string) => {
    await createEstado({ name })
    qc.invalidateQueries({ queryKey: ['estados'] })
    toast.success('Estado creado')
  }

  // ── Prioridades ──
  const prioridadItems: GenericItem[] = prioridades.map(p => ({
    id: p.prioridad_ID,
    name: p.name,
    color: p.color,
    isSystem: p.is_system,
  }))
  const onSavePrioridad  = async (id: string, name: string) => {
    await updatePrioridad(id, { name })
    qc.invalidateQueries({ queryKey: ['prioridades'] })
    toast.success('Prioridad actualizada')
  }
  const onDeletePrioridad = async (id: string, name: string) => {
    if (!window.confirm(`¿Eliminar la prioridad "${name}"?`)) return
    await deletePrioridad(id)
    qc.invalidateQueries({ queryKey: ['prioridades'] })
    toast.success('Prioridad eliminada')
  }
  const onCreatePrioridad = async (name: string) => {
    await createPrioridad({ name })
    qc.invalidateQueries({ queryKey: ['prioridades'] })
    toast.success('Prioridad creada')
  }

  // ── Tipos ──
  const tipoItems: GenericItem[] = tipos.map(t => ({ id: t.tipos_ID, name: t.name }))
  const onSaveTipo  = async (id: string, name: string) => {
    await updateTipo(id, { name })
    qc.invalidateQueries({ queryKey: ['tipos'] })
    toast.success('Tipo actualizado')
  }
  const onDeleteTipo = async (id: string, name: string) => {
    if (!window.confirm(`¿Eliminar el tipo "${name}"?`)) return
    await deleteTipo(id)
    qc.invalidateQueries({ queryKey: ['tipos'] })
    toast.success('Tipo eliminado')
  }
  const onCreateTipo = async (name: string) => {
    await createTipo({ name })
    qc.invalidateQueries({ queryKey: ['tipos'] })
    toast.success('Tipo creado')
  }

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ── */}
      <div className="bg-card border-b border-border px-6 flex-shrink-0" style={{ minHeight: 72 }}>
        <div className="flex items-center gap-3 py-4">
          <div className="w-9 h-9 rounded-xl bg-ocean-500 flex items-center justify-center flex-shrink-0">
            <Sliders size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-foreground">Configuración</h1>
            <p className="text-xs text-muted-foreground">Estados, prioridades y tipos de proyecto</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'px-4 py-2 text-xs font-semibold border-b-2 transition-all',
                tab === t ? 'border-ocean-500 text-ocean-500' : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {t}
              <span className="ml-1.5 text-[9px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
                {t === 'Estados' ? estados.length : t === 'Prioridades' ? prioridades.length : tipos.length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Contenido ── */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
          >
            {tab === 'Estados' && (
              <CrudSection
                items={estadoItems}
                isLoading={loadingEstados}
                emptyLabel="Estado"
                onSave={onSaveEstado}
                onDelete={onDeleteEstado}
                onCreate={onCreateEstado}
                readOnly={estadoItems.every(e => e.isSystem)}
                readOnlyMessage="Los estados de proyectos y tareas son definidos por el sistema."
              />
            )}
            {tab === 'Prioridades' && (
              <CrudSection
                items={prioridadItems}
                isLoading={loadingPrioridades}
                emptyLabel="Prioridad"
                onSave={onSavePrioridad}
                onDelete={onDeletePrioridad}
                onCreate={onCreatePrioridad}
                readOnly={prioridadItems.every(p => p.isSystem)}
                readOnlyMessage="Las prioridades son definidas por el sistema."
              />
            )}
            {tab === 'Tipos' && (
              <CrudSection
                items={tipoItems}
                isLoading={loadingTipos}
                emptyLabel="Tipo"
                onSave={onSaveTipo}
                onDelete={onDeleteTipo}
                onCreate={onCreateTipo}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
