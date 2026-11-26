import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { KeyRound } from 'lucide-react'
import { getCatalogoPermisos, getPermisosDeUsuario } from '@/lib/api'
import { formatDate } from '@/lib/utils'

// «Ver como»: lo que puede hacer la persona por su rol y en qué equipos está (con su vencimiento).
export default function PermisosDeUsuario({ usuarioId }: { usuarioId: string }) {
  const { data } = useQuery({ queryKey: ['permisos-de-usuario', usuarioId], queryFn: () => getPermisosDeUsuario(usuarioId) })
  const { data: catalogo } = useQuery({ queryKey: ['catalogo-permisos'], queryFn: getCatalogoPermisos, staleTime: 30 * 60_000 })
  if (!data || !catalogo) return null
  const alcance = Object.fromEntries(catalogo.alcances.map(a => [a.codigo, a.etiqueta]))
  const porModulo = catalogo.modulos
    .map(m => ({ ...m, permisos: catalogo.permisos.filter(p => p.modulo === m.codigo && data.permisos[p.codigo]) }))
    .filter(m => m.permisos.length > 0)

  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <h3 className="flex items-center gap-1.5 text-xs font-bold text-foreground uppercase tracking-wider mb-3">
        <KeyRound size={13} aria-hidden="true" /> Lo que puede hacer · {data.rol}
      </h3>
      {porModulo.length === 0 ? (
        <p className="text-sm text-muted-foreground">Su rol no tiene permisos asignados.</p>
      ) : (
        <dl className="space-y-2">
          {porModulo.map(m => (
            <div key={m.codigo}>
              <dt className="text-xs font-semibold text-muted-foreground">{m.nombre}</dt>
              <dd>
                <ul className="mt-0.5 space-y-0.5">
                  {m.permisos.map(p => (
                    <li key={p.codigo} className="text-sm text-foreground">
                      {p.etiqueta}
                      {p.admite_alcance && <span className="text-muted-foreground"> · {alcance[data.permisos[p.codigo]] ?? data.permisos[p.codigo]}</span>}
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          ))}
        </dl>
      )}
      {data.equipos.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-xs font-semibold text-muted-foreground mb-1">Además, en el equipo de</p>
          <ul className="space-y-0.5">
            {data.equipos.map(e => (
              <li key={e.proyecto} className="text-sm">
                <Link to={`/projects/${e.proyecto}`} className="text-foreground hover:underline">{e.nombre}</Link>
                <span className="text-muted-foreground"> · {e.rol}{e.hasta ? ` · hasta el ${formatDate(e.hasta)}` : ''}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
