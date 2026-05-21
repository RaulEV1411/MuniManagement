import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Calendar, Building2, MapPin } from 'lucide-react'
import { getPublicProject } from '@/lib/api'

interface PublicTask {
  tareas_ID: string
  name: string
  fecha_inicio: string
  fecha_entrega: string
  estado: { name: string; color: string } | null
}

export default function PublicProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: p, isLoading } = useQuery<any>({
    queryKey: ['public-project', id],
    queryFn: () => getPublicProject(id!),
    enabled: !!id,
  })

  if (isLoading) return <div className="p-10 text-center text-slate-500">Cargando…</div>
  if (!p) return <div className="p-10 text-center text-slate-500">No encontrado.</div>

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-ocean-500 text-white">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <Link to="/publico" className="inline-flex items-center gap-2 text-white/80 hover:text-white text-sm mb-4">
            <ArrowLeft className="h-4 w-4" /> Volver al portal
          </Link>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold">{p.name}</h1>
              <p className="text-white/80 mt-1 max-w-2xl">{p.descripcion}</p>
            </div>
            {p.estado && (
              <span
                className="text-sm px-3 py-1 rounded-full text-white font-semibold"
                style={{ backgroundColor: p.estado.color }}
              >
                {p.estado.name}
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Info icon={Building2} label="Dirección" value={p.direccion} />
          <Info icon={MapPin} label="Departamento" value={p.departamento} />
          <Info icon={Calendar} label="Inicio" value={p.fecha_inicio} />
          <Info icon={Calendar} label="Entrega" value={p.fecha_entrega} />
        </section>

        <section className="rounded-2xl bg-white border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-900 mb-3">Avance general</h2>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-ocean-500" style={{ width: `${p.avance}%` }} />
            </div>
            <span className="text-lg font-bold text-slate-900">{p.avance}%</span>
          </div>
        </section>

        {p.images?.length > 0 && (
          <section>
            <h2 className="font-semibold text-slate-900 mb-3">Imágenes</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {p.images.map((img: any) => (
                <img
                  key={img.imagen_ID}
                  src={img.url}
                  alt=""
                  className="h-40 w-full object-cover rounded-xl border border-slate-200"
                />
              ))}
            </div>
          </section>
        )}

        {p.tareas?.length > 0 && (
          <section className="rounded-2xl bg-white border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-900 mb-3">Tareas del proyecto</h2>
            <ul className="space-y-2">
              {(p.tareas as PublicTask[]).map(t => (
                <li key={t.tareas_ID} className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{t.name}</p>
                    <p className="text-xs text-slate-500">Entrega {t.fecha_entrega}</p>
                  </div>
                  {t.estado && (
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full text-white font-semibold"
                      style={{ backgroundColor: t.estado.color }}
                    >
                      {t.estado.name}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  )
}

function Info({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white border border-slate-200 p-3">
      <Icon className="h-4 w-4 text-slate-500" />
      <div>
        <p className="text-[11px] uppercase text-slate-500">{label}</p>
        <p className="text-sm font-medium text-slate-900">{value}</p>
      </div>
    </div>
  )
}
