import { Fragment, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'
import {
  createRol, createRolProyecto, deleteRol, deleteRolProyecto, getCatalogoPermisos,
  getRolesConPermisos, getRolesProyecto, updateRol, updateRolProyecto,
} from '@/lib/api'
import type { Alcance, CatalogoPermisos, Role, RolProyecto } from '@/types'
import { mensajeDeError } from '@/lib/errores'
import { confirmar } from '@/lib/confirmar'
import ErrorDeCarga from '@/components/common/ErrorDeCarga'

const celda = 'px-2 py-1.5 border-b border-border'
const inputCls = 'px-3 py-1.5 text-sm bg-background border border-input rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-ring'

// Matriz de permisos: qué puede hacer cada rol de la institución (y con qué alcance) y qué da cada rol
// dentro de un proyecto. Cada cambio se guarda al momento; el servidor valida todo.
export default function RolesPermisosPanel() {
  const { data: catalogo, error, refetch } = useQuery({ queryKey: ['catalogo-permisos'], queryFn: getCatalogoPermisos, staleTime: 30 * 60_000 })
  if (error) return <ErrorDeCarga error={error} onReintentar={refetch} que="el catálogo de permisos" />
  if (!catalogo) return <div className="h-40 rounded-2xl bg-muted/40 animate-pulse" role="status" aria-label="Cargando" />
  return (
    <div className="space-y-8 max-w-full">
      <MatrizInstitucion catalogo={catalogo} />
      <MatrizProyecto catalogo={catalogo} />
    </div>
  )
}

function MatrizInstitucion({ catalogo }: { catalogo: CatalogoPermisos }) {
  const qc = useQueryClient()
  const { data: roles = [] } = useQuery<Role[]>({ queryKey: ['roles-con-permisos'], queryFn: getRolesConPermisos })
  const [nombre, setNombre] = useState('')
  const [copiarDe, setCopiarDe] = useState('')
  const invalidar = () => qc.invalidateQueries({ queryKey: ['roles-con-permisos'] })

  const guardar = useMutation({
    mutationFn: ({ rol, permisos }: { rol: Role; permisos: Record<string, Alcance> }) => updateRol(rol.role_ID, { permisos }),
    onSuccess: () => { toast.success('Permiso guardado'); invalidar() },
    onError: err => toast.error(mensajeDeError(err, 'No se pudo guardar el permiso')),
  })
  const crear = useMutation({
    mutationFn: () => createRol({ name: nombre.trim(), permisos: roles.find(r => r.role_ID === copiarDe)?.permisos ?? {} }),
    onSuccess: () => { toast.success('Rol creado'); setNombre(''); setCopiarDe(''); invalidar() },
    onError: err => toast.error(mensajeDeError(err, 'No se pudo crear el rol')),
  })
  const borrar = useMutation({
    mutationFn: (rol: Role) => deleteRol(rol.role_ID),
    onSuccess: () => { toast.success('Rol borrado'); invalidar() },
    onError: err => toast.error(mensajeDeError(err, 'No se pudo borrar el rol')),
  })

  const cambiar = (rol: Role, codigo: string, alcance: Alcance | '') => {
    const permisos = { ...(rol.permisos ?? {}) }
    if (alcance) permisos[codigo] = alcance
    else delete permisos[codigo]
    guardar.mutate({ rol, permisos })
  }

  return (
    <section className="space-y-3" aria-labelledby="matriz-institucion">
      <div>
        <h2 id="matriz-institucion" className="text-sm font-bold text-foreground">Roles de la institución</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          El alcance dice sobre qué: <strong>lo propio</strong> (lo suyo), <strong>su departamento</strong> (el suyo o el que dirige),{' '}
          <strong>su dirección</strong> o <strong>toda la institución</strong>. El Administrador siempre tiene todo.
        </p>
      </div>
      <form className="flex flex-wrap items-end gap-2" onSubmit={e => { e.preventDefault(); if (nombre.trim()) crear.mutate() }}>
        <div>
          <label htmlFor="rol-nuevo" className="block text-xs font-semibold text-muted-foreground mb-1">Rol nuevo</label>
          <input id="rol-nuevo" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej.: Inspector" maxLength={50} className={inputCls} />
        </div>
        <div>
          <label htmlFor="rol-copiar" className="block text-xs font-semibold text-muted-foreground mb-1">Con los permisos de</label>
          <select id="rol-copiar" value={copiarDe} onChange={e => setCopiarDe(e.target.value)} className={inputCls}>
            <option value="">Ninguno</option>
            {roles.filter(r => r.name !== 'Administrador').map(r => <option key={r.role_ID} value={r.role_ID}>{r.name}</option>)}
          </select>
        </div>
        <button type="submit" disabled={!nombre.trim() || crear.isPending} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-ocean-500 hover:bg-ocean-600 text-white rounded-xl disabled:opacity-50">
          <Plus size={13} aria-hidden="true" /> Crear rol
        </button>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" tabIndex={0} role="region" aria-label="Matriz de permisos por rol">
        <table className="text-xs min-w-max">
          <thead>
            <tr>
              <th scope="col" className={`${celda} text-left sticky left-0 bg-card z-10 min-w-[220px]`}>Permiso</th>
              {roles.map(r => (
                <th key={r.role_ID} scope="col" className={`${celda} text-left font-semibold whitespace-nowrap`}>
                  <span className="flex items-center gap-1">
                    {r.name}
                    {!r.is_system && (
                      <button
                        type="button"
                        aria-label={`Borrar el rol ${r.name}`}
                        onClick={async () => { if (await confirmar({ titulo: `¿Borrar el rol «${r.name}»?`, mensaje: 'Solo se puede si nadie lo tiene asignado.' })) borrar.mutate(r) }}
                        className="p-0.5 rounded text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {catalogo.modulos.map(m => {
              const permisos = catalogo.permisos.filter(p => p.modulo === m.codigo)
              if (!permisos.length) return null
              return (
                <Fragment key={m.codigo}>
                  <tr>
                    <th colSpan={roles.length + 1} scope="colgroup" className="px-2 pt-3 pb-1 text-left text-xs font-bold uppercase tracking-wide text-muted-foreground sticky left-0 bg-card">
                      {m.nombre}
                    </th>
                  </tr>
                  {permisos.map(p => (
                    <tr key={p.codigo}>
                      <th scope="row" className={`${celda} text-left font-normal text-foreground sticky left-0 bg-card z-10`}>{p.etiqueta}</th>
                      {roles.map(r => {
                        const esAdmin = r.name === 'Administrador'
                        const valor = esAdmin ? 'todos' : (r.permisos?.[p.codigo] ?? '')
                        const nombreCelda = `${p.etiqueta} · ${r.name}`
                        return (
                          <td key={r.role_ID} className={celda}>
                            {p.admite_alcance ? (
                              <select
                                aria-label={nombreCelda}
                                value={valor}
                                disabled={esAdmin || guardar.isPending}
                                onChange={e => cambiar(r, p.codigo, e.target.value as Alcance | '')}
                                className="px-1.5 py-1 text-xs bg-background border border-input rounded-lg disabled:opacity-60"
                              >
                                <option value="">—</option>
                                {catalogo.alcances.map(a => <option key={a.codigo} value={a.codigo}>{a.etiqueta}</option>)}
                              </select>
                            ) : (
                              <input
                                type="checkbox"
                                aria-label={nombreCelda}
                                checked={!!valor}
                                disabled={esAdmin || guardar.isPending}
                                onChange={e => cambiar(r, p.codigo, e.target.checked ? 'todos' : '')}
                                className="h-4 w-4"
                              />
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function MatrizProyecto({ catalogo }: { catalogo: CatalogoPermisos }) {
  const qc = useQueryClient()
  const { data: roles = [] } = useQuery<RolProyecto[]>({ queryKey: ['roles-proyecto'], queryFn: getRolesProyecto })
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const invalidar = () => qc.invalidateQueries({ queryKey: ['roles-proyecto'] })
  const permisos = catalogo.permisos.filter(p => p.en_proyecto)

  const guardar = useMutation({
    mutationFn: ({ rol, lista }: { rol: RolProyecto; lista: string[] }) => updateRolProyecto(rol.rol_proyecto_ID, { permisos: lista }),
    onSuccess: () => { toast.success('Permiso guardado'); invalidar() },
    onError: err => toast.error(mensajeDeError(err, 'No se pudo guardar el permiso')),
  })
  const crear = useMutation({
    mutationFn: () => createRolProyecto({ nombre: nombre.trim(), descripcion: descripcion.trim(), permisos: ['proyectos.ver'] }),
    onSuccess: () => { toast.success('Rol de proyecto creado'); setNombre(''); setDescripcion(''); invalidar() },
    onError: err => toast.error(mensajeDeError(err, 'No se pudo crear el rol')),
  })
  const borrar = useMutation({
    mutationFn: (rol: RolProyecto) => deleteRolProyecto(rol.rol_proyecto_ID),
    onSuccess: () => { toast.success('Rol de proyecto borrado'); invalidar() },
    onError: err => toast.error(mensajeDeError(err, 'No se pudo borrar el rol')),
  })

  return (
    <section className="space-y-3" aria-labelledby="matriz-proyecto">
      <div>
        <h2 id="matriz-proyecto" className="text-sm font-bold text-foreground">Roles dentro de un proyecto</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Valen solo en el proyecto donde se asignan, con la vigencia que se elija. El dueño cuenta como Responsable y quien tiene tareas, como Colaborador.
        </p>
      </div>
      <form className="flex flex-wrap items-end gap-2" onSubmit={e => { e.preventDefault(); if (nombre.trim()) crear.mutate() }}>
        <div>
          <label htmlFor="rolp-nuevo" className="block text-xs font-semibold text-muted-foreground mb-1">Rol de proyecto nuevo</label>
          <input id="rolp-nuevo" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej.: Inspector de obra" maxLength={50} className={inputCls} />
        </div>
        <div>
          <label htmlFor="rolp-desc" className="block text-xs font-semibold text-muted-foreground mb-1">Para qué sirve</label>
          <input id="rolp-desc" value={descripcion} onChange={e => setDescripcion(e.target.value)} maxLength={255} className={inputCls} />
        </div>
        <button type="submit" disabled={!nombre.trim() || crear.isPending} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-ocean-500 hover:bg-ocean-600 text-white rounded-xl disabled:opacity-50">
          <Plus size={13} aria-hidden="true" /> Crear rol
        </button>
      </form>
      <div className="overflow-x-auto rounded-2xl border border-border bg-card focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" tabIndex={0} role="region" aria-label="Matriz de permisos por rol de proyecto">
        <table className="text-xs min-w-max">
          <thead>
            <tr>
              <th scope="col" className={`${celda} text-left sticky left-0 bg-card z-10 min-w-[220px]`}>Permiso</th>
              {roles.map(r => (
                <th key={r.rol_proyecto_ID} scope="col" className={`${celda} text-left font-semibold whitespace-nowrap`} title={r.descripcion}>
                  <span className="flex items-center gap-1">
                    {r.nombre}
                    {!r.is_system && (
                      <button
                        type="button"
                        aria-label={`Borrar el rol de proyecto ${r.nombre}`}
                        onClick={async () => { if (await confirmar({ titulo: `¿Borrar el rol «${r.nombre}»?`, mensaje: 'Solo se puede si nadie lo tiene en un proyecto.' })) borrar.mutate(r) }}
                        className="p-0.5 rounded text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {permisos.map(p => (
              <tr key={p.codigo}>
                <th scope="row" className={`${celda} text-left font-normal text-foreground sticky left-0 bg-card z-10`}>{p.etiqueta}</th>
                {roles.map(r => (
                  <td key={r.rol_proyecto_ID} className={celda}>
                    <input
                      type="checkbox"
                      aria-label={`${p.etiqueta} · ${r.nombre}`}
                      checked={r.permisos.includes(p.codigo)}
                      disabled={guardar.isPending}
                      onChange={e => guardar.mutate({ rol: r, lista: e.target.checked ? [...r.permisos, p.codigo] : r.permisos.filter(c => c !== p.codigo) })}
                      className="h-4 w-4"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
