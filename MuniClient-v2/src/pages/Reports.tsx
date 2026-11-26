import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FileDown, FileSpreadsheet, Search, ChevronDown } from 'lucide-react'
import { getProjects, getDepartments, getEstados } from '@/lib/api'
import { type Project, type Department, type Estado } from '@/types'
import { cn, formatDate, isOverdue } from '@/lib/utils'
import { toast } from 'sonner'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { mensajeDeError } from '@/lib/errores'
import ErrorDeCarga from '@/components/common/ErrorDeCarga'
import { claseEtiqueta, colorDeEstado, conColor } from '@/lib/colores'

// Costo con los aumentos y rebajos aprobados; si el servidor no lo manda, el costo base.
const costoTotal = (p: Project) => p.costo_total ?? p.costo ?? 0

export default function ReportsPage() {
  const [search, setSearch]           = useState('')
  const [deptFilter, setDeptFilter]   = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const { data: projects = [], isLoading, isError, error, refetch } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: getProjects,
  })
  const { data: estados = [] } = useQuery<Estado[]>({ queryKey: ['estados'], queryFn: getEstados, staleTime: 300_000 })
  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: getDepartments,
  })

  const filtered = useMemo(() => {
    let r = projects
    if (deptFilter) r = r.filter(p => p.departamento_ID?.departamentos_ID === deptFilter)
    if (statusFilter) {
      if (statusFilter === 'Vencido') r = r.filter(p => isOverdue(p))
      else r = r.filter(p => p.estado_ID?.name === statusFilter && !isOverdue(p))
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      r = r.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.departamento_ID?.name ?? '').toLowerCase().includes(q),
      )
    }
    return r
  }, [projects, deptFilter, statusFilter, search])

  const totalCost = filtered.reduce((sum, p) => sum + costoTotal(p), 0)

  const exportPDF = () => {
    try {
      const doc = new jsPDF()

      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(12, 56, 87)
      doc.text('Municipalidad de Puntarenas', 14, 18)

      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100)
      doc.text(
        `Reporte de Proyectos · ${new Date().toLocaleDateString('es-CR', { dateStyle: 'long' })}`,
        14, 26,
      )
      doc.text(
        `Total proyectos: ${filtered.length}   Costo total: ₡${totalCost.toLocaleString('es-CR')}`,
        14, 32,
      )

      autoTable(doc, {
        startY: 38,
        head: [['#', 'Proyecto', 'Departamento', 'Estado', 'Prioridad', 'F. Entrega', 'Costo total (₡)']],
        body: filtered.map((p, i) => [
          i + 1,
          p.name,
          p.departamento_ID?.name ?? '—',
          isOverdue(p) ? 'Vencido' : (p.estado_ID?.name ?? '—'),
          p.prioridad_ID?.name ?? '—',
          formatDate(p.fecha_entrega),
          costoTotal(p).toLocaleString('es-CR'),
        ]),
        foot: [['', '', '', '', '', `Total (${filtered.length})`, totalCost.toLocaleString('es-CR')]],
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [12, 56, 87], textColor: 255, fontStyle: 'bold' },
        footStyles: { fillColor: [230, 236, 241], textColor: 30, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: { 0: { cellWidth: 8 }, 6: { halign: 'right' } },
      })

      doc.save(`proyectos_${new Date().toISOString().slice(0, 10)}.pdf`)
      toast.success('PDF exportado correctamente')
    } catch (err) {
      toast.error(mensajeDeError(err, 'Error al exportar PDF'))
    }
  }

  const exportExcel = async () => {
    try {
      const { default: writeExcelFile } = await import('write-excel-file/browser')
      const encabezados = ['#', 'Proyecto', 'Departamento', 'Estado', 'Prioridad', 'Responsable', 'Fecha Inicio', 'Fecha Entrega', 'Costo total (₡)']
      const filas = filtered.map((p, i) => [
        i + 1,
        p.name,
        p.departamento_ID?.name ?? '',
        isOverdue(p) ? 'Vencido' : (p.estado_ID?.name ?? ''),
        p.prioridad_ID?.name ?? '',
        p.user_ID ? `${p.user_ID.first_name} ${p.user_ID.last_name}` : '',
        formatDate(p.fecha_inicio),
        formatDate(p.fecha_entrega),
        costoTotal(p),
      ])

      await writeExcelFile([encabezados, ...filas], {
        sheet: 'Proyectos',
        columns: [4, 35, 22, 14, 10, 25, 14, 14, 16].map(width => ({ width })),
      }).toFile(`proyectos_${new Date().toISOString().slice(0, 10)}.xlsx`)
      toast.success('Excel exportado correctamente')
    } catch (err) {
      toast.error(mensajeDeError(err, 'Error al exportar Excel'))
    }
  }

  const selectCls = 'pl-2.5 pr-7 py-1.5 text-xs bg-background border border-input rounded-xl text-foreground appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring'

  if (isError) return <ErrorDeCarga error={error} onReintentar={refetch} que="los proyectos" />

  return (
    <div className="flex flex-col h-full">

      {/* ── Header ── */}
      <div className="bg-card border-b border-border px-6 flex items-center gap-3 flex-shrink-0" style={{ height: 72 }}>
        <div className="w-9 h-9 rounded-xl bg-ocean-500 flex items-center justify-center flex-shrink-0">
          <FileDown size={16} className="text-white" />
        </div>
        <div className="flex-1">
          <h1 className="text-base font-bold text-foreground">Reportes</h1>
          {!isLoading && (
            <p className="text-xs text-muted-foreground">
              {filtered.length} proyecto{filtered.length !== 1 ? 's' : ''} · ₡{totalCost.toLocaleString('es-CR')}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={exportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-all active:scale-[0.98]"
          >
            <FileSpreadsheet size={13} /> Excel
          </button>
          <button
            onClick={exportPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl transition-all active:scale-[0.98]"
          >
            <FileDown size={13} /> PDF
          </button>
        </div>
      </div>

      {/* ── Contenido ── */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

        {/* Filtros */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-48 max-w-sm">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar proyecto..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-background border border-input rounded-xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="relative">
            <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className={selectCls}>
              <option value="">Todos los departamentos</option>
              {departments.map(d => <option key={d.departamentos_ID} value={d.departamentos_ID}>{d.name}</option>)}
            </select>
            <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>
          <div className="relative">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={selectCls}>
              <option value="">Todos los estados</option>
              {[...estados.map(e => e.name), 'Vencido'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>
          {(search || deptFilter || statusFilter) && (
            <button
              onClick={() => { setSearch(''); setDeptFilter(''); setStatusFilter('') }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        {/* Tabla */}
        {isLoading ? (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-12 border-b border-border last:border-0 animate-pulse bg-muted/30" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
            <FileDown size={32} className="text-muted-foreground/30" />
            <p className="text-sm font-medium text-foreground">Sin resultados</p>
            <p className="text-xs text-muted-foreground">No hay proyectos con los filtros seleccionados</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider w-8">#</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Proyecto</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Departamento</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Estado</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Prioridad</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">F. Entrega</th>
                  <th className="px-4 py-3 text-right text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Costo</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => {
                  const od = isOverdue(p)
                  const statusName = od ? 'Vencido' : (p.estado_ID?.name ?? 'Pendiente')
                  return (
                    <tr key={p.proyect_ID} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 text-xs text-muted-foreground">{i + 1}</td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-foreground">{p.name}</p>
                        {p.user_ID && (
                          <p className="text-[10px] text-muted-foreground">{p.user_ID.first_name} {p.user_ID.last_name}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{p.departamento_ID?.name ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', claseEtiqueta)} style={conColor(colorDeEstado(od, p.estado_ID))}>
                          {statusName}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {p.prioridad_ID?.name && (
                          <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', claseEtiqueta)} style={conColor(p.prioridad_ID.color)}>
                            {p.prioridad_ID.name}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(p.fecha_entrega)}</td>
                      <td className="px-4 py-3 text-sm font-medium text-right text-foreground">
                        {`₡${costoTotal(p).toLocaleString('es-CR')}`}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-muted/30 border-t-2 border-border">
                  <td colSpan={5} className="px-4 py-3 text-xs font-bold text-muted-foreground">
                    Total: {filtered.length} proyecto{filtered.length !== 1 ? 's' : ''}
                  </td>
                  <td />
                  <td className="px-4 py-3 text-sm font-bold text-right text-foreground">
                    ₡{totalCost.toLocaleString('es-CR')}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
