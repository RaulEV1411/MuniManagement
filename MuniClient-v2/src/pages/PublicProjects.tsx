import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { Calendar, Download, LayoutGrid, Map as IconoMapa, MapPin, Search } from 'lucide-react'
import { getPublicProjects, urlDatosAbiertos } from '@/lib/api'
import type { PublicProject } from '@/types'
import ErrorDeCarga from '@/components/common/ErrorDeCarga'
import { useValorDiferido } from '@/hooks/useValorDiferido'
import LogoInstitucion from '@/components/common/LogoInstitucion'
import { useMarca, useTituloDePagina } from '@/hooks/useMarca'
import { textoSobre } from '@/lib/colores'
import { formatearMonto } from '@/lib/marca'
import { cn, formatearFechaLarga } from '@/lib/utils'
import Mapa from '@/components/mapa/Mapa'
import { centroDeLaInstitucion, type PuntoDelMapa } from '@/components/mapa/tipos'

type Grupo = 'todos' | 'en_curso' | 'pausados' | 'terminados' | 'cancelados'

const GRUPOS: [Grupo, string][] = [
  ['todos', 'Todos'], ['en_curso', 'En ejecución'], ['pausados', 'En pausa'], ['terminados', 'Finalizados'], ['cancelados', 'Cancelados'],
]

function grupoDe(p: PublicProject): Exclude<Grupo, 'todos'> {
  if (p.estado?.categoria === 'pausado') return 'pausados'
  if (p.estado?.categoria !== 'finalizado') return 'en_curso'
  return p.estado.name === 'Cancelado' ? 'cancelados' : 'terminados'
}

export default function PublicProjectsPage() {
  useTituloDePagina('Portal de proyectos')
  const marca = useMarca()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [grupo, setGrupo] = useState<Grupo>('todos')
  const [vista, setVista] = useState<'tarjetas' | 'mapa'>('tarjetas')
  // Consulta al dejar de escribir, no por cada tecla: el portal admite 60 consultas por minuto.
  const busqueda = useValorDiferido(search.trim())
  const { data: todos = [], isLoading, isError, error, refetch } = useQuery<PublicProject[]>({
    queryKey: ['public-projects', busqueda],
    queryFn: () => getPublicProjects(busqueda),
  })
  // Memorizada: si cambiara en cada render, el mapa rehace los marcadores (y cierra la burbuja) con cada tecla.
  const proyectos = useMemo(() => (grupo === 'todos' ? todos : todos.filter(p => grupoDe(p) === grupo)), [todos, grupo])
  const puntos = useMemo<PuntoDelMapa[]>(() => proyectos
    .filter(p => p.latitud != null && p.longitud != null)
    .map(p => ({
      id: p.proyect_ID, lat: Number(p.latitud), lng: Number(p.longitud), titulo: p.name,
      detalle: [p.estado?.name, p.distrito || p.departamento].filter(Boolean).join(' · '),
      enlace: `/publico/proyectos/${p.proyect_ID}`,
    })), [proyectos])
  const sinPunto = proyectos.length - puntos.length

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-ocean-500 text-white">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <LogoInstitucion tamano={36} claro />
            <h1 className="text-2xl font-bold">Portal de proyectos</h1>
            <Link to="/login" className="ml-auto text-sm font-semibold text-white underline-offset-2 hover:underline">
              Ingreso del personal
            </Link>
          </div>
          <p className="text-white">{marca.nombre}{marca.ubicacion ? ` · ${marca.ubicacion}` : ''}</p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex flex-wrap items-end gap-3 mb-6">
          <div className="relative flex-1 min-w-[16rem] max-w-lg">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre, descripción o departamento…"
              aria-label="Buscar proyectos"
              className="w-full pl-10 pr-3 py-3 rounded-xl border border-slate-200 bg-white text-base focus:outline-none focus:ring-2 focus:ring-ocean-500"
            />
          </div>
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-700">
            Estado
            <select value={grupo} onChange={e => setGrupo(e.target.value as Grupo)}
              className="px-3 py-3 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-ocean-500">
              {GRUPOS.map(([g, nombre]) => <option key={g} value={g}>{nombre}</option>)}
            </select>
          </label>
          <div role="group" aria-label="Vista" className="inline-flex rounded-xl border border-slate-300 bg-white p-1">
            {([['tarjetas', 'Tarjetas', LayoutGrid], ['mapa', 'Mapa', IconoMapa]] as const).map(([v, nombre, Icono]) => (
              <button key={v} type="button" aria-pressed={vista === v} onClick={() => setVista(v)}
                className={cn('inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold',
                  vista === v ? 'bg-ocean-500 text-white' : 'text-slate-700 hover:bg-slate-100')}>
                <Icono className="h-4 w-4" aria-hidden /> {nombre}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-56 rounded-2xl bg-white animate-pulse" />
            ))}
          </div>
        ) : isError ? (
          <ErrorDeCarga error={error} onReintentar={refetch} que="los proyectos" />
        ) : proyectos.length === 0 ? (
          <p className="text-center text-slate-500 py-16">No hay proyectos para mostrar.</p>
        ) : vista === 'mapa' ? (
          <div className="space-y-2">
            <Mapa puntos={puntos} etiqueta="Mapa de los proyectos" alto="h-[32rem]" centro={centroDeLaInstitucion(marca)}
              alAbrir={p => navigate(p.enlace!)} />
            {sinPunto > 0 && (
              <p className="text-xs text-slate-600">
                {sinPunto === 1 ? 'Un proyecto no tiene ubicación y no aparece en el mapa.' : `${sinPunto} proyectos no tienen ubicación y no aparecen en el mapa.`}
                {' '}Están en la vista de tarjetas.
              </p>
            )}
          </div>
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
                        className="text-xs px-2 py-0.5 rounded-full font-semibold shrink-0"
                        style={{ backgroundColor: p.estado.color, color: textoSobre(p.estado.color) }}
                      >
                        {p.estado.name}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2 mb-3">{p.descripcion}</p>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                    <MapPin className="h-3 w-3" />
                    <span>{p.distrito ? `${p.distrito} · ` : ''}{p.direccion} · {p.departamento}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                    <Calendar className="h-3 w-3" />
                    <span>{p.cierre ? `${p.cierre.estado} el ${formatearFechaLarga(p.cierre.fecha)}` : `Entrega: ${formatearFechaLarga(p.fecha_entrega)}`}</span>
                  </div>
                  <p className="text-xs text-slate-500 mb-3">
                    Presupuesto {formatearMonto(p.presupuesto, marca.moneda)} · ejecutado {formatearMonto(p.ejecutado, marca.moneda)}
                  </p>
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

        <section aria-labelledby="datos-abiertos" className="mt-10 rounded-2xl bg-white border border-slate-200 p-5 space-y-2">
          <h2 id="datos-abiertos" className="font-semibold text-slate-900">Datos abiertos</h2>
          <p className="text-sm text-slate-700">
            Todos los proyectos públicos, con su presupuesto, ejecución, ubicación y cierre, para usar en una hoja de cálculo o en otro sistema.
          </p>
          <div className="flex flex-wrap gap-2">
            {(['csv', 'json'] as const).map(f => (
              <a key={f} href={urlDatosAbiertos(f)} download
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 text-sm font-semibold text-slate-800 hover:bg-slate-100">
                <Download className="h-4 w-4" aria-hidden /> Descargar en {f.toUpperCase()}
              </a>
            ))}
          </div>
          <p className="text-xs text-slate-600">
            Licencia: <a href={marca.licencia.url} target="_blank" rel="noreferrer license" className="underline text-slate-800">{marca.licencia.nombre}</a>.
            {' '}Montos en {marca.moneda}.
          </p>
        </section>
      </main>

      {/* El portal es siempre claro (fondos slate fijos): el texto usa colores fijos, no los del tema. */}
      <footer className="text-center text-xs text-slate-600 py-6">
        Información pública municipal · Actualizada periódicamente ·{' '}
        <Link to="/accesibilidad" className="underline text-slate-700 hover:text-slate-900">Accesibilidad</Link>
        {' · '}
        <Link to="/privacidad" className="underline text-slate-700 hover:text-slate-900">Aviso de privacidad</Link>
      </footer>
    </div>
  )
}
