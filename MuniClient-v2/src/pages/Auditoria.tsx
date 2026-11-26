import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ShieldCheck, Search, ChevronDown, ChevronRight, FileJson, FileSpreadsheet, ShieldAlert, Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  getCatalogoAuditoria, getRegistrosAuditoria, getResumenAuditoria, urlExportarAuditoria, verificarAuditoria,
  type Filtros,
} from '@/lib/api'
import type { RegistroAuditoria, ResultadoAuditoria, VerificacionAuditoria } from '@/types'
import Cambios from '@/components/auditoria/Cambios'
import { cn, formatearFechaHora } from '@/lib/utils'
import { mensajeDeError } from '@/lib/errores'
import ErrorDeCarga from '@/components/common/ErrorDeCarga'
import { useValorDiferido } from '@/hooks/useValorDiferido'
import { useTituloDePagina } from '@/hooks/useMarca'
import { usePermiso } from '@/hooks/usePermiso'

const CLASE_RESULTADO: Record<ResultadoAuditoria, string> = {
  exito: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200',
  fallo: 'bg-amber-50 text-amber-900 dark:bg-amber-500/10 dark:text-amber-200',
  denegado: 'bg-red-50 text-red-800 dark:bg-red-500/10 dark:text-red-200',
}

const FILTROS = ['modulo', 'accion', 'resultado', 'usuario', 'objeto_id', 'desde', 'hasta', 'q'] as const

function Tarjeta({ titulo, valor, nota }: { titulo: string; valor: number | string; nota?: string }) {
  return (
    <div className="bg-card border border-border rounded-2xl px-4 py-3">
      <p className="text-xs font-semibold text-muted-foreground">{titulo}</p>
      <p className="text-2xl font-bold text-foreground tabular-nums">{valor}</p>
      {nota && <p className="text-xs text-muted-foreground">{nota}</p>}
    </div>
  )
}

function Fila({ r }: { r: RegistroAuditoria }) {
  const [abierta, setAbierta] = useState(false)
  const persona = r.usuario_nombre || r.usuario_email || 'Sin identificar'
  return (
    <>
      <tr className="border-b border-border last:border-0 hover:bg-muted/20 align-top">
        <td className="px-3 py-2.5">
          <button
            type="button"
            onClick={() => setAbierta(a => !a)}
            aria-expanded={abierta}
            aria-label={`Ver el detalle del registro ${r.id}`}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            {abierta ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        </td>
        <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{formatearFechaHora(r.creado_en)}</td>
        <td className="px-3 py-2.5">
          {r.usuario
            ? <Link to={`/users/${r.usuario}`} className="text-sm font-medium text-foreground hover:underline">{persona}</Link>
            : <span className="text-sm font-medium text-foreground">{persona}</span>}
          {r.rol && <p className="text-xs text-muted-foreground">{r.rol}</p>}
        </td>
        <td className="px-3 py-2.5 text-xs text-foreground">{r.modulo_display}</td>
        <td className="px-3 py-2.5 text-xs text-foreground">{r.accion_display}</td>
        <td className="px-3 py-2.5 text-sm text-foreground max-w-[260px] truncate" title={r.objeto_repr}>{r.objeto_repr || '—'}</td>
        <td className="px-3 py-2.5">
          <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap', CLASE_RESULTADO[r.resultado])}>
            {r.resultado_display}
          </span>
        </td>
        <td className="px-3 py-2.5 text-xs text-muted-foreground">
          <p>{r.ip || '—'}</p>
          {r.dispositivo && <p>{r.dispositivo}</p>}
        </td>
      </tr>
      {abierta && (
        <tr className="border-b border-border bg-muted/20">
          <td />
          <td colSpan={7} className="px-3 py-3 space-y-2">
            {r.motivo && <p className="text-xs"><span className="font-semibold text-muted-foreground">Motivo: </span>{r.motivo}</p>}
            <Cambios detalle={r.detalle} />
            <p className="text-[11px] text-muted-foreground break-all">
              Registro {r.id}{r.sesion ? ` · sesión ${r.sesion.slice(0, 8)}` : ''} · huella {r.hash.slice(0, 16)}…
            </p>
          </td>
        </tr>
      )}
    </>
  )
}

export default function AuditoriaPage() {
  useTituloDePagina('Auditoría')
  const puedeVer = usePermiso('auditoria.ver')
  const [params, setParams] = useSearchParams()
  const [pagina, setPagina] = useState(1)
  const [verificacion, setVerificacion] = useState<VerificacionAuditoria | null>(null)
  const [verificando, setVerificando] = useState(false)

  const filtros: Filtros = Object.fromEntries(FILTROS.map(k => [k, params.get(k) ?? '']))
  const busqueda = useValorDiferido(String(filtros.q ?? ''))
  const consulta: Filtros = { ...filtros, q: busqueda, page: pagina }

  const cambiar = (clave: typeof FILTROS[number], valor: string) => {
    const nuevos = new URLSearchParams(params)
    if (valor) nuevos.set(clave, valor)
    else nuevos.delete(clave)
    setParams(nuevos, { replace: true })
    setPagina(1)
  }

  const { data: catalogo } = useQuery({ queryKey: ['auditoria-catalogo'], queryFn: getCatalogoAuditoria, enabled: puedeVer, staleTime: Infinity })
  const { data: resumen } = useQuery({ queryKey: ['auditoria-resumen'], queryFn: getResumenAuditoria, enabled: puedeVer })
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['auditoria', consulta],
    queryFn: () => getRegistrosAuditoria(consulta),
    enabled: puedeVer,
    placeholderData: previo => previo,
  })

  const verificar = async () => {
    setVerificando(true)
    try {
      setVerificacion(await verificarAuditoria())
    } catch (err) {
      toast.error(mensajeDeError(err, 'No se pudo verificar la auditoría.'))
    } finally {
      setVerificando(false)
    }
  }

  if (!puedeVer) {
    return <p className="p-6 text-sm text-muted-foreground">Su rol no permite ver la auditoría.</p>
  }
  if (isError) return <ErrorDeCarga error={error} onReintentar={refetch} que="la auditoría" />

  const total = data?.count ?? 0
  const paginas = Math.max(1, Math.ceil(total / 50))
  const hayFiltros = FILTROS.some(k => params.get(k))
  const selectCls = 'pl-2.5 pr-7 py-1.5 text-xs bg-background border border-input rounded-xl text-foreground appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring'
  const inputCls = 'px-2.5 py-1.5 text-xs bg-background border border-input rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-ring'
  const selector = (clave: 'modulo' | 'accion' | 'resultado', etiqueta: string, todos: string, opciones = catalogo?.[clave === 'modulo' ? 'modulos' : clave === 'accion' ? 'acciones' : 'resultados'] ?? []) => (
    <div className="relative">
      <select aria-label={etiqueta} value={String(filtros[clave] ?? '')} onChange={e => cambiar(clave, e.target.value)} className={cn(selectCls, 'w-full')}>
        <option value="">{todos}</option>
        {opciones.map(o => <option key={o.codigo} value={o.codigo}>{o.nombre}</option>)}
      </select>
      <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
    </div>
  )

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ── */}
      <div className="bg-card border-b border-border px-4 sm:px-6 py-3 flex flex-wrap items-center gap-3 flex-shrink-0" style={{ minHeight: 72 }}>
        <div className="w-9 h-9 rounded-xl bg-ocean-500 flex items-center justify-center flex-shrink-0">
          <ShieldCheck size={16} className="text-white" />
        </div>
        <div className="flex-1 min-w-[200px]">
          <h1 className="text-base font-bold text-foreground">Auditoría</h1>
          <p className="text-xs text-muted-foreground">Quién hizo qué, cuándo y desde dónde. Los registros no se editan ni se borran.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={verificar}
            disabled={verificando}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-border bg-background hover:bg-muted text-foreground text-xs font-semibold rounded-xl disabled:opacity-60"
          >
            {verificando ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />} Verificar integridad
          </button>
          <a href={urlExportarAuditoria('csv', filtros)} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl">
            <FileSpreadsheet size={13} /> CSV
          </a>
          <a href={urlExportarAuditoria('json', filtros)} className="flex items-center gap-1.5 px-3 py-1.5 bg-ocean-500 hover:bg-ocean-600 text-white text-xs font-semibold rounded-xl">
            <FileJson size={13} /> JSON
          </a>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
        {verificacion && (
          <div role="status" className={cn(
            'rounded-2xl border px-4 py-3 text-sm',
            verificacion.ok
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100'
              : 'border-red-200 bg-red-50 text-red-900 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-100',
          )}>
            {verificacion.ok
              ? `La cadena está íntegra: se revisaron ${verificacion.revisados} registros y ninguno fue alterado.`
              : `Se encontró una alteración${verificacion.registro ? ` en el registro ${verificacion.registro}` : ''}: ${verificacion.motivo}`}
          </div>
        )}

        {resumen && (
          <section aria-label="Resumen" className="space-y-3">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Tarjeta titulo="Conectadas ahora" valor={resumen.conectadas_ahora} nota="con actividad en 15 min" />
              <Tarjeta titulo="Sesiones abiertas" valor={resumen.sesiones_abiertas} />
              <Tarjeta titulo="Registros de hoy" valor={resumen.registros_hoy} />
              <Tarjeta titulo="Intentos sin permiso" valor={resumen.denegados_24h} nota="en las últimas 24 h" />
            </div>
            {resumen.con_intentos_fallidos.length > 0 && (
              <div className="rounded-2xl border border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10 px-4 py-3">
                <p className="flex items-center gap-2 text-sm font-semibold text-red-900 dark:text-red-100">
                  <ShieldAlert size={15} aria-hidden="true" />
                  {resumen.con_intentos_fallidos.length === 1 ? '1 cuenta' : `${resumen.con_intentos_fallidos.length} cuentas`} con {resumen.umbral_fallidos} o más intentos fallidos en 24 h
                </p>
                <ul className="mt-1.5 space-y-0.5 text-xs text-red-900 dark:text-red-100">
                  {resumen.con_intentos_fallidos.map(p => (
                    <li key={p.user_ID}>
                      <Link to={`/users/${p.user_ID}`} className="font-semibold underline">{p.nombre || p.email}</Link>
                      {' · '}{p.intentos} intentos, el último {formatearFechaHora(p.ultimo)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {resumen.total_inactivas > 0 && (
              <details className="rounded-2xl border border-border bg-card px-4 py-3">
                <summary className="cursor-pointer text-sm font-semibold text-foreground">
                  {resumen.total_inactivas === 1 ? '1 cuenta activa' : `${resumen.total_inactivas} cuentas activas`} sin conectarse en {resumen.dias_inactiva} días
                </summary>
                <p className="mt-1 text-xs text-muted-foreground">Conviene revisar si siguen en la institución o darlas de baja.</p>
                <ul className="mt-1.5 space-y-0.5 text-xs">
                  {resumen.inactivas.map(p => (
                    <li key={p.user_ID}>
                      <Link to={`/users/${p.user_ID}`} className="font-semibold text-foreground hover:underline">{p.nombre || p.email}</Link>
                      <span className="text-muted-foreground"> · {p.ultima_conexion ? `última conexión ${formatearFechaHora(p.ultima_conexion)}` : 'sin conexiones registradas'}</span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </section>
        )}

        {/* Filtros: en el celular, en dos columnas */}
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
          <div className="relative col-span-2 sm:flex-1 sm:min-w-48 sm:max-w-sm">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={String(filtros.q ?? '')}
              onChange={e => cambiar('q', e.target.value)}
              placeholder="Buscar por objeto, correo, IP o motivo…"
              aria-label="Buscar en la auditoría"
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-background border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          {selector('modulo', 'Filtrar por módulo', 'Todos los módulos')}
          {selector('accion', 'Filtrar por acción', 'Todas las acciones')}
          {selector('resultado', 'Filtrar por resultado', 'Todos los resultados')}
          <label className="col-span-2 sm:col-span-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="w-11 sm:w-auto">Desde</span>
            <input type="date" value={String(filtros.desde ?? '')} onChange={e => cambiar('desde', e.target.value)} className={cn(inputCls, 'flex-1 sm:flex-none')} />
          </label>
          <label className="col-span-2 sm:col-span-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="w-11 sm:w-auto">Hasta</span>
            <input type="date" value={String(filtros.hasta ?? '')} onChange={e => cambiar('hasta', e.target.value)} className={cn(inputCls, 'flex-1 sm:flex-none')} />
          </label>
          {hayFiltros && (
            <button type="button" onClick={() => { setParams(new URLSearchParams(), { replace: true }); setPagina(1) }} className="text-xs text-muted-foreground hover:text-foreground">
              Limpiar filtros
            </button>
          )}
        </div>
        {(params.get('usuario') || params.get('objeto_id')) && (
          <p className="text-xs text-muted-foreground">
            Mostrando solo los registros {params.get('usuario') ? 'de una persona' : 'de un objeto'}.
          </p>
        )}

        {/* Tabla */}
        {isLoading ? (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            {[...Array(6)].map((_, i) => <div key={i} className="h-12 border-b border-border last:border-0 animate-pulse bg-muted/30" />)}
          </div>
        ) : total === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2 text-center">
            <ShieldCheck size={32} className="text-muted-foreground/30" />
            <p className="text-sm font-medium text-foreground">Sin registros</p>
            <p className="text-xs text-muted-foreground">No hay registros con los filtros seleccionados.</p>
          </div>
        ) : (
          <>
            <div className="bg-card border border-border rounded-2xl overflow-x-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" tabIndex={0} role="region" aria-label="Registros de auditoría">
              <table className="w-full min-w-[920px]">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    <th className="px-3 py-3 w-8"><span className="sr-only">Detalle</span></th>
                    <th className="px-3 py-3">Fecha</th>
                    <th className="px-3 py-3">Persona</th>
                    <th className="px-3 py-3">Módulo</th>
                    <th className="px-3 py-3">Acción</th>
                    <th className="px-3 py-3">Sobre</th>
                    <th className="px-3 py-3">Resultado</th>
                    <th className="px-3 py-3">Origen</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.results.map(r => <Fila key={r.id} r={r} />)}
                </tbody>
              </table>
            </div>
            <nav aria-label="Páginas de la auditoría" className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
              <span>{total} registro{total !== 1 ? 's' : ''} · página {pagina} de {paginas}</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => setPagina(p => p - 1)} disabled={pagina <= 1}
                  className="px-3 py-1.5 border border-border rounded-xl bg-background hover:bg-muted text-foreground disabled:opacity-50">Anterior</button>
                <button type="button" onClick={() => setPagina(p => p + 1)} disabled={pagina >= paginas}
                  className="px-3 py-1.5 border border-border rounded-xl bg-background hover:bg-muted text-foreground disabled:opacity-50">Siguiente</button>
              </div>
            </nav>
          </>
        )}
      </div>
    </div>
  )
}
