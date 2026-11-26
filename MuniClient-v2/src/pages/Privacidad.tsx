import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useMarca, useTituloDePagina } from '@/hooks/useMarca'
import LogoInstitucion from '@/components/common/LogoInstitucion'
import TextoDelAviso from '@/components/privacidad/TextoDelAviso'

/** Página pública del aviso de privacidad: se lee sin sesión y se enlaza desde el login y el portal. */
export default function PrivacidadPage() {
  useTituloDePagina('Aviso de privacidad')
  const marca = useMarca()
  return (
    <main className="min-h-full bg-background px-4 py-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <LogoInstitucion tamano={40} />
          <div>
            <p className="text-sm font-bold text-foreground">{marca.nombre}</p>
            <h1 className="text-xl font-bold text-foreground">Aviso de privacidad</h1>
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-6">
          <TextoDelAviso marca={marca} />
        </div>
        <Link to="/login" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ocean-500 dark:text-ocean-200 hover:underline">
          <ArrowLeft size={14} aria-hidden="true" /> Volver al ingreso
        </Link>
      </div>
    </main>
  )
}
