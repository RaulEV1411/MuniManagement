import { MapPin } from 'lucide-react'
import { useMarca } from '@/hooks/useMarca'
import { cn } from '@/lib/utils'

// El logo que subió el Administrador; si no hay, el ícono de siempre sobre el color principal.
export default function LogoInstitucion({ tamano = 32, claro = false, className }: { tamano?: number; claro?: boolean; className?: string }) {
  const { logo, nombre } = useMarca()
  if (logo) {
    return (
      <img
        src={logo}
        alt={`Logo de ${nombre}`}
        width={tamano}
        height={tamano}
        className={cn('rounded-xl object-contain flex-shrink-0 bg-white', className)}
        style={{ width: tamano, height: tamano }}
      />
    )
  }
  return (
    <div
      className={cn('rounded-xl flex items-center justify-center flex-shrink-0', claro ? 'bg-white/10' : 'bg-ocean-500 shadow-sm', className)}
      style={{ width: tamano, height: tamano }}
      aria-hidden="true"
    >
      <MapPin size={Math.round(tamano / 2)} className="text-white" />
    </div>
  )
}
