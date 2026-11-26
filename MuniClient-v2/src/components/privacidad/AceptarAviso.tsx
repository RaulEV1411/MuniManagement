import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { aceptarPrivacidad } from '@/lib/api'
import { mensajeDeError } from '@/lib/errores'
import { useMarca } from '@/hooks/useMarca'
import { useAppStore } from '@/store/app'
import Dialogo from '@/components/common/Dialogo'
import TextoDelAviso from './TextoDelAviso'

/** Al primer ingreso (y con cada versión nueva) se lee y se acepta el aviso antes de usar el sistema. */
export default function AceptarAviso() {
  const marca = useMarca()
  const qc = useQueryClient()
  const logout = useAppStore(s => s.logout)
  const [enviando, setEnviando] = useState(false)

  const aceptar = async () => {
    setEnviando(true)
    try {
      await aceptarPrivacidad(marca.privacidad_version)
      useAppStore.setState(s => ({ user: s.user ? { ...s.user, privacidad_pendiente: false } : s.user }))
    } catch (err) {
      // Si el aviso cambió mientras lo leía, se vuelve a cargar para que lea la versión nueva.
      await qc.invalidateQueries({ queryKey: ['configuracion'] })
      toast.error(mensajeDeError(err, 'No se pudo registrar la aceptación.'))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Dialogo titulo="Aviso de privacidad" onCerrar={() => undefined} fondo="bg-black/60" capa="z-[200]">
      <div className="w-full max-w-2xl rounded-2xl bg-card shadow-2xl flex flex-col max-h-[calc(100vh-2rem)]">
        <div className="px-6 pt-6 pb-3 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Aviso de privacidad</h2>
          <p className="text-sm text-muted-foreground">Antes de seguir, lea cómo {marca.nombre} usa sus datos.</p>
        </div>
        <div className="px-6 py-4 overflow-y-auto" tabIndex={0} role="region" aria-label="Texto del aviso de privacidad">
          <TextoDelAviso marca={marca} />
        </div>
        <div className="px-6 py-4 border-t border-border flex flex-wrap justify-end gap-2">
          <button type="button" onClick={() => logout()} className="px-4 py-2 text-sm font-semibold rounded-xl border border-border hover:bg-muted">
            Salir
          </button>
          <button type="button" disabled={enviando} onClick={aceptar} className="px-4 py-2 text-sm font-semibold rounded-xl bg-ocean-500 hover:bg-ocean-600 text-white disabled:opacity-60">
            {enviando ? 'Guardando…' : 'Leí el aviso y acepto'}
          </button>
        </div>
      </div>
    </Dialogo>
  )
}
