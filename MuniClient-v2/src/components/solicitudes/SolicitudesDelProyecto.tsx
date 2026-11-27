import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Inbox, Plus } from 'lucide-react'
import { getSolicitudes } from '@/lib/api'
import type { Project, Task } from '@/types'
import ListaSolicitudes from './ListaSolicitudes'
import DetalleSolicitud from './DetalleSolicitud'
import NuevaSolicitud from './NuevaSolicitud'

/** La pestaña Solicitudes del proyecto: las que se hicieron y el botón para pedir. */
export default function SolicitudesDelProyecto({ project, tasks, puedePedir }: { project: Project; tasks: Task[]; puedePedir: boolean }) {
  const qc = useQueryClient()
  const [nueva, setNueva] = useState(false)
  const [abierta, setAbierta] = useState<number | null>(null)
  const filtros = { bandeja: 'todas', proyecto: project.proyect_ID, page_size: 100 }
  const { data, isLoading } = useQuery({ queryKey: ['solicitudes', filtros], queryFn: () => getSolicitudes(filtros) })
  const solicitudes = data?.results ?? []

  return (
    <div className="max-w-3xl space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Prórrogas, presupuesto, personal y otros cambios: al aprobarse se aplican solos.</p>
        {puedePedir && (
          <button type="button" onClick={() => setNueva(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-ocean-500 hover:bg-ocean-600 text-white text-xs font-semibold rounded-xl flex-shrink-0">
            <Plus size={12} aria-hidden="true" /> Nueva solicitud
          </button>
        )}
      </div>
      {isLoading ? <div className="h-24 bg-muted rounded-2xl animate-pulse" /> : solicitudes.length === 0 ? (
        <div className="flex flex-col items-center py-14 gap-2 text-center">
          <Inbox size={28} className="text-muted-foreground/30" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">Este proyecto no tiene solicitudes.</p>
        </div>
      ) : <ListaSolicitudes solicitudes={solicitudes} onAbrir={setAbierta} conProyecto={false} />}
      {nueva && (
        <NuevaSolicitud project={project} tasks={tasks} onCerrar={() => setNueva(false)}
          onListo={() => { setNueva(false); qc.invalidateQueries({ queryKey: ['solicitudes'] }) }} />
      )}
      {abierta && <DetalleSolicitud numero={abierta} onCerrar={() => setAbierta(null)} />}
    </div>
  )
}
