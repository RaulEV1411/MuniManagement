import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ChevronDown, Inbox } from 'lucide-react'
import { getConteoSolicitudes, getSolicitudes } from '@/lib/api'
import { cn } from '@/lib/utils'
import { pestanas } from '@/lib/pestanas'
import { useTituloDePagina } from '@/hooks/useMarca'
import ErrorDeCarga from '@/components/common/ErrorDeCarga'
import ListaSolicitudes from '@/components/solicitudes/ListaSolicitudes'
import DetalleSolicitud from '@/components/solicitudes/DetalleSolicitud'

const BANDEJAS = [
  { clave: 'por_aprobar', nombre: 'Por aprobar' },
  { clave: 'mias', nombre: 'Mis solicitudes' },
  { clave: 'todas', nombre: 'Todas' },
] as const
type Bandeja = typeof BANDEJAS[number]['clave']

export default function SolicitudesPage() {
  useTituloDePagina('Solicitudes')
  const [params, setParams] = useSearchParams()
  const [bandeja, setBandeja] = useState<Bandeja>('por_aprobar')
  const [estado, setEstado] = useState('abiertas')
  const [pagina, setPagina] = useState(1)
  const abierta = Number(params.get('abrir')) || null
  const abrir = (n: number | null) => setParams(prev => {
    const next = new URLSearchParams(prev)
    if (n) next.set('abrir', String(n))
    else next.delete('abrir')
    return next
  }, { replace: true })
  const elegir = (b: Bandeja) => { setBandeja(b); setPagina(1) }
  const tabs = pestanas('solicitudes', BANDEJAS.map(b => b.clave), bandeja, elegir)

  const { data: conteo } = useQuery({ queryKey: ['solicitudes', 'conteo'], queryFn: getConteoSolicitudes })
  const consulta = { bandeja, ...(bandeja !== 'por_aprobar' && estado && { estado }), page: pagina }
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['solicitudes', consulta],
    queryFn: () => getSolicitudes(consulta),
    placeholderData: keepPreviousData,
  })
  if (isError) return <ErrorDeCarga error={error} onReintentar={refetch} que="las solicitudes" />
  const total = data?.count ?? 0
  const paginas = Math.max(1, Math.ceil(total / 50))

  return (
    <div className="flex flex-col h-full">
      <div className="bg-card border-b border-border px-4 sm:px-6 py-3 flex items-center gap-3 flex-shrink-0" style={{ minHeight: 72 }}>
        <div className="w-9 h-9 rounded-xl bg-ocean-500 flex items-center justify-center flex-shrink-0">
          <Inbox size={16} className="text-white" />
        </div>
        <div>
          <h1 className="text-base font-bold text-foreground">Solicitudes</h1>
          <p className="text-xs text-muted-foreground">Prórrogas, presupuesto, personal y otros cambios. El proyecto sigue mientras se deciden.</p>
        </div>
      </div>
      <div {...tabs.lista} aria-label="Bandejas" className="bg-card border-b border-border px-4 sm:px-6 flex gap-1 overflow-x-auto flex-shrink-0">
        {BANDEJAS.map(({ clave, nombre }) => (
          <button key={clave} {...tabs.pestana(clave)} className={cn(
            'px-3 py-2 text-xs font-semibold border-b-2 whitespace-nowrap',
            bandeja === clave ? 'border-ocean-500 text-ocean-500 dark:text-ocean-200' : 'border-transparent text-muted-foreground hover:text-foreground',
          )}>
            {nombre}
            {clave === 'por_aprobar' && conteo !== undefined && (
              <span className="ml-1.5 text-[11px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full tabular-nums">{conteo.por_aprobar}</span>
            )}
          </button>
        ))}
      </div>
      <div {...tabs.panel} className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-3 focus:outline-none">
        {bandeja !== 'por_aprobar' && (
          <div className="relative w-fit">
            <select aria-label="Filtrar por estado" value={estado} onChange={e => { setEstado(e.target.value); setPagina(1) }}
              className="pl-2.5 pr-7 py-1.5 text-xs bg-background border border-input rounded-xl text-foreground appearance-none focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="abiertas">Abiertas</option>
              <option value="aprobada">Aprobadas</option>
              <option value="rechazada">Rechazadas</option>
              <option value="retirada">Retiradas</option>
              <option value="">Todas</option>
            </select>
            <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>
        )}
        {isLoading ? (
          <div className="h-40 bg-muted rounded-2xl animate-pulse" />
        ) : total === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2 text-center">
            <Inbox size={32} className="text-muted-foreground/30" />
            <p className="text-sm font-medium text-foreground">{bandeja === 'por_aprobar' ? 'Nada por aprobar' : 'Sin solicitudes'}</p>
            <p className="text-xs text-muted-foreground">Las solicitudes se hacen desde cada proyecto, en la pestaña Solicitudes.</p>
          </div>
        ) : (
          <>
            <ListaSolicitudes solicitudes={data?.results ?? []} onAbrir={abrir} />
            {paginas > 1 && (
              <nav aria-label="Páginas de solicitudes" className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{total} solicitudes · página {pagina} de {paginas}</span>
                <div className="flex gap-2">
                  <button type="button" disabled={pagina <= 1} onClick={() => setPagina(p => p - 1)} className="px-3 py-1.5 border border-border rounded-xl bg-background text-foreground disabled:opacity-50">Anterior</button>
                  <button type="button" disabled={pagina >= paginas} onClick={() => setPagina(p => p + 1)} className="px-3 py-1.5 border border-border rounded-xl bg-background text-foreground disabled:opacity-50">Siguiente</button>
                </div>
              </nav>
            )}
          </>
        )}
      </div>
      {abierta && <DetalleSolicitud numero={abierta} onCerrar={() => abrir(null)} />}
    </div>
  )
}
