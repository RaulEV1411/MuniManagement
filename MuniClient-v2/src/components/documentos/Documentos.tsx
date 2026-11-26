import { useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FileText, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { borrarDocumento, getDocumentos, subirDocumento } from '@/lib/api'
import type { TipoDocumento } from '@/types'
import { formatearFechaHora } from '@/lib/utils'
import { mensajeDeError } from '@/lib/errores'
import { confirmar } from '@/lib/confirmar'

const CATEGORIAS: { clave: TipoDocumento; nombre: string }[] = [
  { clave: 'plano', nombre: 'Plano' }, { clave: 'informe', nombre: 'Informe' }, { clave: 'factura', nombre: 'Factura' },
  { clave: 'contrato', nombre: 'Contrato' }, { clave: 'acta', nombre: 'Acta' }, { clave: 'foto', nombre: 'Foto' }, { clave: 'otro', nombre: 'Otro' },
]
const ACEPTA = 'application/pdf,image/jpeg,image/png,image/webp,.docx,.xlsx,.pptx'

/** Documentos del proyecto o de una tarea: PDF, Word, Excel, PowerPoint o imagen (hasta 10 MB), con categoría. */
export default function Documentos({ proyectoId, tareaId, puedeSubir, usuarioId }: {
  proyectoId: string
  tareaId?: string
  puedeSubir: boolean
  usuarioId: string
}) {
  const qc = useQueryClient()
  const archivo = useRef<HTMLInputElement>(null)
  const [tipo, setTipo] = useState<TipoDocumento>('plano')
  const [subiendo, setSubiendo] = useState(false)
  const filtro = tareaId ? { tarea: tareaId } : { proyecto: proyectoId, solo_proyecto: '1' }
  const { data: documentos = [], isLoading } = useQuery({ queryKey: ['documentos', filtro], queryFn: () => getDocumentos(filtro) })
  const recargar = async () => {
    await qc.invalidateQueries({ queryKey: ['documentos'] })
    await qc.invalidateQueries({ queryKey: ['tasks', proyectoId] })
  }

  const subir = async (file: File | undefined) => {
    if (!file) return
    setSubiendo(true)
    try {
      await subirDocumento({ ...(tareaId ? { tarea: tareaId } : { proyecto: proyectoId }), tipo, archivo: file })
      toast.success('Documento subido')
      await recargar()
    } catch (err) {
      toast.error(mensajeDeError(err, 'No se pudo subir el documento.'))
    } finally {
      setSubiendo(false)
      if (archivo.current) archivo.current.value = ''
    }
  }

  return (
    <div className="space-y-3">
      {puedeSubir && (
        <div className="flex flex-wrap items-center gap-2">
          <select aria-label="Categoría del documento" value={tipo} onChange={e => setTipo(e.target.value as TipoDocumento)}
            className="px-2 py-1.5 text-xs bg-background border border-input rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
            {CATEGORIAS.map(c => <option key={c.clave} value={c.clave}>{c.nombre}</option>)}
          </select>
          <input ref={archivo} type="file" accept={ACEPTA} className="sr-only" id={`doc-${tareaId ?? proyectoId}`}
            onChange={e => subir(e.target.files?.[0])} />
          <label htmlFor={`doc-${tareaId ?? proyectoId}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-border hover:bg-muted cursor-pointer focus-within:ring-2 focus-within:ring-ring">
            <Upload size={12} aria-hidden="true" /> {subiendo ? 'Subiendo…' : 'Subir documento'}
          </label>
          <span className="text-[11px] text-muted-foreground">PDF, Word, Excel, PowerPoint o imagen, hasta 10 MB</span>
        </div>
      )}
      {isLoading ? <div className="h-12 bg-muted rounded-xl animate-pulse" /> : documentos.length === 0 ? (
        <p className="text-xs text-muted-foreground">Sin documentos.</p>
      ) : (
        <ul className="divide-y divide-border border border-border rounded-xl">
          {documentos.map(d => (
            <li key={d.documento_ID} className="flex items-center gap-2 px-3 py-2">
              <FileText size={14} className="text-muted-foreground flex-shrink-0" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-foreground hover:underline truncate block">{d.nombre}</a>
                <p className="text-[11px] text-muted-foreground">{d.tipo_display}{d.subido_por_nombre ? ` · ${d.subido_por_nombre}` : ''} · {formatearFechaHora(d.creado_en)}</p>
              </div>
              {(puedeSubir || d.subido_por === usuarioId) && (
                <button type="button" aria-label={`Borrar ${d.nombre}`}
                  onClick={async () => {
                    if (!(await confirmar({ titulo: `¿Borrar «${d.nombre}»?`, accion: 'Borrar' }))) return
                    try {
                      await borrarDocumento(d.documento_ID)
                      await recargar()
                    } catch (err) {
                      toast.error(mensajeDeError(err, 'No se pudo borrar el documento.'))
                    }
                  }}
                  className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                  <Trash2 size={13} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
