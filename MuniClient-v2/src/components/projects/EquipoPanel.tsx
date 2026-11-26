import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Pencil, Trash2, UserPlus, Users as UsersIcon, X, History, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { createMiembro, deleteMiembro, getMiembros, getRolesProyecto, getUsers, updateMiembro } from '@/lib/api'
import type { MiembroProyecto, RolProyecto, User } from '@/types'
import { mensajeDeError } from '@/lib/errores'
import { formatDate, fullName } from '@/lib/utils'
import Dialogo from '@/components/common/Dialogo'
import { confirmar } from '@/lib/confirmar'
import { useAppStore } from '@/store/app'

type Persona = Pick<User, 'user_ID' | 'first_name' | 'last_name'>

interface Props {
  proyectoId: string
  responsable?: Persona | null
  /** Personas con tareas asignadas: integran el equipo como Colaboradores sin necesidad de agregarlas. */
  conTareas: Persona[]
  canManage: boolean
}

const hoy = () => new Date().toISOString().slice(0, 10)
const cls = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary'

function vigencia(m: MiembroProyecto) {
  const desde = formatDate(m.desde)
  if (!m.hasta) return `Desde el ${desde}, sin vencimiento`
  const resto = m.dias_restantes ?? 0
  const cuando = resto === 0 ? 'vence hoy' : resto === 1 ? 'vence mañana' : `vence en ${resto} días`
  return `Del ${desde} al ${formatDate(m.hasta)} · ${cuando}`
}

export default function EquipoPanel({ proyectoId, responsable, conTareas, canManage }: Props) {
  const qc = useQueryClient()
  const yo = useAppStore(s => s.user)
  const { data: miembros = [] } = useQuery<MiembroProyecto[]>({ queryKey: ['miembros', proyectoId], queryFn: () => getMiembros(proyectoId) })
  const { data: roles = [] } = useQuery<RolProyecto[]>({ queryKey: ['roles-proyecto'], queryFn: getRolesProyecto, staleTime: 5 * 60_000 })
  const { data: usuarios = [] } = useQuery<User[]>({ queryKey: ['users'], queryFn: getUsers, enabled: canManage })

  const [editando, setEditando] = useState<MiembroProyecto | 'nuevo' | null>(null)
  const [historial, setHistorial] = useState(false)

  const invalidar = () => qc.invalidateQueries({ queryKey: ['miembros', proyectoId] })
  const quitar = useMutation({
    mutationFn: (id: string) => deleteMiembro(id),
    onSuccess: () => { toast.success('Acceso quitado'); invalidar() },
    onError: err => toast.error(mensajeDeError(err, 'No se pudo quitar el acceso')),
  })

  const activos = miembros.filter(m => m.activo && !(m.hasta && m.dias_restantes !== null && m.dias_restantes < 0))
  const pasados = miembros.filter(m => !activos.includes(m))
  const conTareasUnicos = conTareas.filter((u, i, a) => a.findIndex(x => x.user_ID === u.user_ID) === i && u.user_ID !== responsable?.user_ID)

  return (
    <section className="rounded-2xl border border-border bg-card p-5" aria-labelledby="equipo-titulo">
      <header className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <UsersIcon className="h-5 w-5 text-primary" aria-hidden="true" />
          <h3 id="equipo-titulo" className="font-semibold text-foreground">Equipo del proyecto</h3>
        </div>
        {canManage && (
          <button onClick={() => setEditando('nuevo')} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90">
            <UserPlus className="h-3.5 w-3.5" aria-hidden="true" /> Agregar persona
          </button>
        )}
      </header>

      <ul className="space-y-2">
        {responsable && (
          <li className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background px-3 py-2">
            <div>
              <p className="text-sm font-medium text-foreground">{fullName(responsable)}</p>
              <p className="text-xs text-muted-foreground">Responsable · dueño del proyecto</p>
            </div>
          </li>
        )}
        {conTareasUnicos.length > 0 && (
          <li className="rounded-lg border border-border/60 bg-background px-3 py-2">
            <p className="text-sm text-foreground">{conTareasUnicos.map(fullName).join(', ')}</p>
            <p className="text-xs text-muted-foreground">Colaboradores · tienen tareas asignadas</p>
          </li>
        )}
        {activos.map(m => {
            const porVencer = m.hasta !== null && m.dias_restantes !== null && m.dias_restantes <= 3
            const programado = m.desde > hoy()
            return (
              <li key={m.miembro_ID} className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-background px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {m.usuario_info ? fullName(m.usuario_info) : 'Persona'}
                    <span className="ml-2 text-xs font-semibold rounded-full bg-muted px-2 py-0.5 text-foreground">{m.rol_info?.nombre}</span>
                    {programado && <span className="ml-1 text-xs font-semibold rounded-full bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 text-blue-800 dark:text-blue-300">Programado</span>}
                  </p>
                  <p className={porVencer ? 'text-xs font-medium text-amber-800 dark:text-amber-400 flex items-center gap-1' : 'text-xs text-muted-foreground'}>
                    {porVencer && <AlertTriangle className="h-3 w-3" aria-hidden="true" />}
                    {vigencia(m)}
                  </p>
                  {(m.motivo || m.otorgado_por_info) && (
                    <p className="text-xs text-muted-foreground truncate">
                      {m.motivo}{m.motivo && m.otorgado_por_info ? ' · ' : ''}{m.otorgado_por_info ? `lo agregó ${fullName(m.otorgado_por_info)}` : ''}
                    </p>
                  )}
                </div>
                {canManage && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => setEditando(m)} aria-label={`Cambiar el acceso de ${m.usuario_info ? fullName(m.usuario_info) : 'esta persona'}`} className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={async () => {
                        const nombre = m.usuario_info ? fullName(m.usuario_info) : 'esta persona'
                        if (await confirmar({ titulo: `¿Quitar a ${nombre} del equipo?`, mensaje: 'Deja de ver el proyecto. Queda registrado quién lo quitó y cuándo.', accion: 'Quitar' })) quitar.mutate(m.miembro_ID)
                      }}
                      aria-label={`Quitar a ${m.usuario_info ? fullName(m.usuario_info) : 'esta persona'} del equipo`}
                      className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </li>
            )
          })}
      </ul>
      {!responsable && conTareasUnicos.length === 0 && activos.length === 0 && (
        <p className="text-sm text-muted-foreground">Todavía no hay nadie en el equipo.</p>
      )}

      {pasados.length > 0 && (
        <div className="mt-3">
          <button onClick={() => setHistorial(v => !v)} aria-expanded={historial} className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
            <History className="h-3.5 w-3.5" aria-hidden="true" /> {historial ? 'Ocultar' : 'Ver'} accesos anteriores ({pasados.length})
          </button>
          {historial && (
            <ul className="mt-2 space-y-1">
              {pasados.map(m => (
                <li key={m.miembro_ID} className="text-xs text-muted-foreground">
                  {m.usuario_info ? fullName(m.usuario_info) : 'Persona'} · {m.rol_info?.nombre} ·{' '}
                  {m.revocado_en ? `quitado el ${formatDate(m.revocado_en.slice(0, 10))}` : `venció el ${formatDate(m.hasta)}`}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {editando && (
        <FormularioMiembro
          proyectoId={proyectoId}
          miembro={editando === 'nuevo' ? null : editando}
          roles={roles}
          candidatos={usuarios.filter(u => u.role?.integra_equipos && u.user_ID !== yo?.user_ID)}
          onCerrar={() => setEditando(null)}
          onGuardado={() => { setEditando(null); invalidar() }}
        />
      )}
    </section>
  )
}

function FormularioMiembro({ proyectoId, miembro, roles, candidatos, onCerrar, onGuardado }: {
  proyectoId: string
  miembro: MiembroProyecto | null
  roles: RolProyecto[]
  candidatos: User[]
  onCerrar: () => void
  onGuardado: () => void
}) {
  const [usuario, setUsuario] = useState(miembro?.usuario ?? '')
  const [rol, setRol] = useState(miembro?.rol ?? roles.find(r => r.nombre === 'Supervisor')?.rol_proyecto_ID ?? '')
  const [desde, setDesde] = useState(miembro?.desde ?? hoy())
  const [hasta, setHasta] = useState(miembro?.hasta ?? '')
  const [motivo, setMotivo] = useState(miembro?.motivo ?? '')
  const guardar = useMutation({
    mutationFn: () => {
      const datos = { rol, desde, hasta: hasta || null, motivo }
      return miembro ? updateMiembro(miembro.miembro_ID, datos) : createMiembro({ ...datos, proyecto: proyectoId, usuario })
    },
    onSuccess: () => { toast.success(miembro ? 'Acceso actualizado' : 'Persona agregada al equipo'); onGuardado() },
    onError: err => toast.error(mensajeDeError(err, 'No se pudo guardar el acceso')),
  })
  const rolElegido = roles.find(r => r.rol_proyecto_ID === rol)
  const titulo = miembro ? 'Cambiar el acceso' : 'Agregar al equipo'

  return (
    <Dialogo titulo={titulo} onCerrar={onCerrar} fondo="bg-black/50">
      <motion.form
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onSubmit={e => { e.preventDefault(); guardar.mutate() }}
        className="w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl space-y-3"
      >
        <header className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-semibold text-foreground">{titulo}</h3>
          <button type="button" aria-label="Cerrar" onClick={onCerrar} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </header>

        {miembro ? (
          <p className="text-sm text-foreground">{miembro.usuario_info ? fullName(miembro.usuario_info) : 'Persona'}</p>
        ) : (
          <div>
            <label htmlFor="equipo-persona" className="block text-sm font-medium text-foreground mb-1">Persona</label>
            <select id="equipo-persona" required value={usuario} onChange={e => setUsuario(e.target.value)} className={cls}>
              <option value="">Seleccione una persona…</option>
              {candidatos.map(u => <option key={u.user_ID} value={u.user_ID}>{fullName(u)} · {u.role?.name}</option>)}
            </select>
          </div>
        )}
        <div>
          <label htmlFor="equipo-rol" className="block text-sm font-medium text-foreground mb-1">Rol en el proyecto</label>
          <select id="equipo-rol" required value={rol} onChange={e => setRol(e.target.value)} className={cls}>
            {roles.map(r => <option key={r.rol_proyecto_ID} value={r.rol_proyecto_ID}>{r.nombre}</option>)}
          </select>
          {rolElegido?.descripcion && <p className="mt-1 text-xs text-muted-foreground">{rolElegido.descripcion}</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="equipo-desde" className="block text-sm font-medium text-foreground mb-1">Desde</label>
            <input id="equipo-desde" type="date" required value={desde} onChange={e => setDesde(e.target.value)} className={cls} />
          </div>
          <div>
            <label htmlFor="equipo-hasta" className="block text-sm font-medium text-foreground mb-1">Hasta (opcional)</label>
            <input id="equipo-hasta" type="date" value={hasta ?? ''} min={desde} onChange={e => setHasta(e.target.value)} className={cls} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">El acceso vence solo. Tres días antes se le avisa a la persona y a usted.</p>
        <div>
          <label htmlFor="equipo-motivo" className="block text-sm font-medium text-foreground mb-1">Motivo (opcional)</label>
          <input id="equipo-motivo" value={motivo} maxLength={255} onChange={e => setMotivo(e.target.value)} placeholder="Ej.: vacaciones del responsable" className={cls} />
        </div>
        <div className="pt-2 flex justify-end gap-2">
          <button type="button" onClick={onCerrar} className="rounded-lg px-4 py-2 text-sm font-medium hover:bg-accent">Cancelar</button>
          <button type="submit" disabled={(!miembro && !usuario) || !rol || guardar.isPending} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
            {guardar.isPending ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </motion.form>
    </Dialogo>
  )
}
