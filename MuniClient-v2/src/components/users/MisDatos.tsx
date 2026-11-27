import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Download, UserX } from 'lucide-react'
import { toast } from 'sonner'
import { anonimizarUsuario, getMisDatos } from '@/lib/api'
import type { User } from '@/types'
import { mensajeDeError } from '@/lib/errores'
import RazonModal from '@/components/common/RazonModal'

const SECCIONES: [string, string][] = [
  ['proyectos_a_cargo', 'Proyectos a cargo'], ['tareas_asignadas', 'Tareas asignadas'], ['equipos', 'Equipos'],
  ['comentarios', 'Comentarios'], ['solicitudes', 'Solicitudes'], ['sesiones', 'Sesiones'], ['acciones', 'Acciones registradas'],
]

function bajar(contenido: Blob, nombre: string) {
  const url = URL.createObjectURL(contenido)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  a.click()
  URL.revokeObjectURL(url)
}

async function comoPdf(datos: Record<string, unknown>, nombre: string) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
  const doc = new jsPDF()
  doc.setFontSize(16)
  doc.text(`Datos personales de ${nombre}`, 14, 18)
  doc.setFontSize(9)
  doc.text(`Generado el ${new Date().toLocaleString('es-CR')} (Ley 8968, derecho de acceso)`, 14, 25)
  const persona = (datos.persona ?? {}) as Record<string, unknown>
  autoTable(doc, {
    startY: 30, head: [['Dato', 'Valor']],
    body: Object.entries(persona).map(([k, v]) => [k.replace(/_/g, ' '), typeof v === 'object' ? JSON.stringify(v) : String(v ?? '')]),
    styles: { fontSize: 8 },
  })
  for (const [clave, titulo] of SECCIONES) {
    const filas = (datos[clave] ?? []) as Record<string, unknown>[]
    const y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8
    doc.setFontSize(11)
    doc.text(`${titulo} (${filas.length})`, 14, y)
    if (!filas.length) continue
    const columnas = Object.keys(filas[0])
    autoTable(doc, {
      startY: y + 3, head: [columnas.map(c => c.replace(/_/g, ' '))],
      body: filas.map(f => columnas.map(c => String(f[c] ?? ''))), styles: { fontSize: 7 },
    })
  }
  return doc.output('blob')
}

/** Derecho de acceso: la persona (o el Administrador) baja todo lo que el sistema guarda de ella.
 * El Administrador también puede anonimizar una cuenta dada de baja, si la persona lo pide. */
export default function MisDatos({ usuario, propio, esAdmin }: { usuario: User; propio: boolean; esAdmin: boolean }) {
  const qc = useQueryClient()
  const [bajando, setBajando] = useState(false)
  const [anonimizando, setAnonimizando] = useState(false)
  const nombre = `${usuario.first_name} ${usuario.last_name}`
  const archivo = `mis-datos_${new Date().toISOString().slice(0, 10)}`

  const descargar = async (formato: 'json' | 'pdf') => {
    setBajando(true)
    try {
      const datos = await getMisDatos(usuario.user_ID)
      bajar(formato === 'json'
        ? new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' })
        : await comoPdf(datos, nombre), `${archivo}.${formato}`)
    } catch (err) {
      toast.error(mensajeDeError(err, 'No se pudieron descargar los datos.'))
    } finally {
      setBajando(false)
    }
  }

  return (
    <section aria-labelledby="mis-datos" className="bg-card border border-border rounded-2xl p-4 space-y-3">
      <h3 id="mis-datos" className="text-xs font-bold text-foreground uppercase tracking-wider">{propio ? 'Mis datos' : 'Datos personales'}</h3>
      <p className="text-xs text-muted-foreground">
        {propio ? 'Todo lo que el sistema guarda de usted' : `Todo lo que el sistema guarda de ${nombre}`}: perfil, proyectos, tareas, equipos, comentarios, solicitudes, sesiones y acciones.
        La descarga queda registrada.
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={bajando} onClick={() => descargar('pdf')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-border hover:bg-muted disabled:opacity-60">
          <Download size={12} aria-hidden="true" /> Descargar en PDF
        </button>
        <button type="button" disabled={bajando} onClick={() => descargar('json')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-border hover:bg-muted disabled:opacity-60">
          <Download size={12} aria-hidden="true" /> Descargar en JSON
        </button>
        {esAdmin && !propio && usuario.is_active === false && (
          <button type="button" onClick={() => setAnonimizando(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-border hover:bg-destructive/10 hover:text-destructive">
            <UserX size={12} aria-hidden="true" /> Anonimizar
          </button>
        )}
      </div>
      {anonimizando && (
        <RazonModal
          title={`Anonimizar a ${nombre}`}
          description="Se borran su nombre, identificación, correo, teléfono, nacimiento, puesto, foto y sesiones. Lo que hizo queda a nombre de «Persona anonimizada». No se puede deshacer. Indique quién lo pidió y cómo."
          onConfirm={async motivo => {
            try {
              await anonimizarUsuario(usuario.user_ID, motivo)
              toast.success('Cuenta anonimizada.')
              setAnonimizando(false)
              await qc.invalidateQueries({ queryKey: ['user', usuario.user_ID] })
            } catch (err) {
              toast.error(mensajeDeError(err, 'No se pudo anonimizar.'))
            }
          }}
          onClose={() => setAnonimizando(false)}
        />
      )}
    </section>
  )
}
