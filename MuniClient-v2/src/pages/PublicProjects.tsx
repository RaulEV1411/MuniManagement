import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Calendar, MapPin, Search, Building2 } from 'lucide-react'
import { getPublicProjects } from '@/lib/api'

interface PublicProject {
  proyect_ID: string
  name: string
  descripcion: string
  fecha_inicio: string
  fecha_entrega: string
  estado: { name: string; color: string } | null
  prioridad: { name: string; color: string } | null
  departamento: string
  direccion: string
  images: Array<{ imagen_ID: string; url: string }>
  avance: number
}

export default function PublicProjectsPage() {
  const [search, setSearch] = useState('')
  const { data: proyectos = [], isLoading } = useQuery<PublicProject[]>({
    queryKey: ['public-projects', search],
    queryFn: () => getPublicProjects(search),
  })

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-ocean-500 text-white">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="h-7 w-7" />
            <h1 className="text-2xl font-bold">Portal de Proyectos Municipales</h1>
          </div>
          <p className="text-white/80">Consulta el avance de los proyectos en tu municipalidad.</p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="relative mb-6 max-w-lg">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre, descripción o departamento…"
            className="w-full pl-10 pr-3 py-3 rounded-xl border border-slate-200 bg-white text-base focus:outline-none focus:ring-2 focus:ring-ocean-500"
          />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-56 rounded-2xl bg-white animate-pulse" />
            ))}
          </div>
        ) : proyectos.length === 0 ? (
          <p className="text-center text-slate-500 py-16">No hay proyectos para mostrar.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {proyectos.map(p => (
              <Link
                key={p.proyect_ID}
                to={`/publico/proyectos/${p.proyect_ID}`}
                className="group rounded-2xl bg-white border border-slate-200 overflow-hidden hover:shadow-lg transition-all"
              >
                {p.images?.[0] && (
                  <div className="h-36 bg-slate-100 overflow-hidden">
                    <img
                      src={p.images[0].url}
                      alt={p.name}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-slate-900 leading-tight">{p.name}</h3>
                    {p.estado && (
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full text-white font-semibold shrink-0"
                        style={{ backgroundColor: p.estado.color }}
                      >
                        {p.estado.name}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2 mb-3">{p.descripcion}</p>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 mb-3">
                    <MapPin className="h-3 w-3" />
                    <span>{p.direccion} · {p.departamento}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 mb-3">
                    <Calendar className="h-3 w-3" />
                    <span>Entrega {p.fecha_entrega}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-ocean-500 transition-all"
                        style={{ width: `${p.avance}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-slate-700">{p.avance}%</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <footer className="text-center text-xs text-slate-500 py-6">
        Información pública municipal · Actualizada periódicamente
      </footer>
    </div>
  )
}
