import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Trash2, UserPlus, X, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { getDelegaciones, createDelegacion, deleteDelegacion, getUsers } from '@/lib/api'
import type { Delegacion, User } from '@/types'

interface Props {
  proyectoId: string
  canManage: boolean
}

// Mantenido como fallback si el backend no devuelve el flag puede_recibir_delegacion.
const ROLES_PUEDEN_RECIBIR = ['Coordinador', 'Funcionario', 'Jefe de Departamento', 'Jefe de Dirección']

export default function DelegacionPanel({ proyectoId, canManage }: Props) {
  const qc = useQueryClient()
  const { data: delegaciones = [] } = useQuery<Delegacion[]>({
    queryKey: ['delegaciones', proyectoId],
    queryFn: () => getDelegaciones(proyectoId),
  })
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: getUsers,
    enabled: canManage,
  })

  const [open, setOpen] = useState(false)
  const [supervisor, setSupervisor] = useState('')
  const [puedeEditar, setPuedeEditar] = useState(false)
  const [expira, setExpira] = useState('')

  const crear = useMutation({
    mutationFn: () =>
      createDelegacion({
        proyecto: proyectoId,
        supervisor,
        puede_editar: puedeEditar,
        expira_en: expira || null,
      }),
    onSuccess: () => {
      toast.success('Supervisión delegada')
      qc.invalidateQueries({ queryKey: ['delegaciones', proyectoId] })
      setOpen(false)
      setSupervisor('')
      setPuedeEditar(false)
      setExpira('')
    },
    onError: () => toast.error('No se pudo delegar la supervisión'),
  })

  const revocar = useMutation({
    mutationFn: (id: string) => deleteDelegacion(id),
    onSuccess: () => {
      toast.success('Delegación revocada')
      qc.invalidateQueries({ queryKey: ['delegaciones', proyectoId] })
    },
  })

  const candidatos = users.filter(u => {
    // Preferir el flag del backend si viene; si no, fallback por nombre.
    const flag = (u.role as any)?.puede_recibir_delegacion
    if (typeof flag === 'boolean') return flag
    return ROLES_PUEDEN_RECIBIR.includes(u.role?.name)
  })

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <header className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">Supervisión delegada</h3>
        </div>
        {canManage && (
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
          >
            <UserPlus className="h-3.5 w-3.5" /> Delegar
          </button>
        )}
      </header>

      {delegaciones.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">Sin supervisores delegados.</p>
      ) : (
        <ul className="space-y-2">
          {delegaciones.map(d => (
            <li key={d.delegacion_ID} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background px-3 py-2">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {d.supervisor_info
                    ? `${d.supervisor_info.first_name} ${d.supervisor_info.last_name}`
                    : 'Supervisor'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {d.puede_editar ? 'Puede editar' : 'Solo lectura'}
                  {d.expira_en ? ` · Expira ${d.expira_en}` : ''}
                </p>
              </div>
              {canManage && (
                <button
                  onClick={() => revocar.mutate(d.delegacion_ID)}
                  className="text-muted-foreground hover:text-red-600"
                  aria-label="Revocar delegación"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
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
              <h3 className="text-lg font-semibold text-foreground">Delegar supervisión</h3>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </header>

            <label className="block text-sm font-medium text-foreground mb-1">Supervisor</label>
            <select
              value={supervisor}
              onChange={e => setSupervisor(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Selecciona un usuario…</option>
              {candidatos.map(u => (
                <option key={u.user_ID} value={u.user_ID}>
                  {u.first_name} {u.last_name} · {u.role.name}
                </option>
              ))}
            </select>

            <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-3">
              <input
                type="checkbox"
                checked={puedeEditar}
                onChange={e => setPuedeEditar(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              Puede editar (no solo ver)
            </label>

            <label className="block text-sm font-medium text-foreground mb-1">Expira (opcional)</label>
            <input
              type="date"
              value={expira}
              onChange={e => setExpira(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />

            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setOpen(false)} className="rounded-lg px-4 py-2 text-sm font-medium hover:bg-accent">
                Cancelar
              </button>
              <button
                disabled={!supervisor || crear.isPending}
                onClick={() => crear.mutate()}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {crear.isPending ? 'Guardando…' : 'Delegar'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </section>
  )
}
