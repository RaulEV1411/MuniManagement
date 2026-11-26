import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { definirClave } from '@/lib/api'
import { useTituloDePagina } from '@/hooks/useMarca'

export default function DefinirClavePage() {
  useTituloDePagina('Definir contraseña')
  const { uid = '', token = '' } = useParams<{ uid: string; token: string }>()
  const navigate = useNavigate()
  const [clave, setClave] = useState('')
  const [repetida, setRepetida] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (clave !== repetida) { setError('Las contraseñas no coinciden.'); return }
    setGuardando(true)
    setError(null)
    try {
      await definirClave(uid, token, clave)
      toast.success('Contraseña guardada. Ya puede iniciar sesión.')
      navigate('/login', { replace: true })
    } catch (err) {
      setError(axios.isAxiosError(err) && err.response?.data?.error
        ? err.response.data.error
        : 'No se pudo guardar la contraseña. Inténtelo de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  const inputCls = 'w-full px-3.5 py-2.5 text-sm bg-background border border-input rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-ring'

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-6">
      <form onSubmit={guardar} className="w-full max-w-sm bg-card border border-border rounded-2xl p-6 space-y-4">
        <h1 className="text-lg font-bold text-foreground">Defina su contraseña</h1>
        <p className="text-sm text-muted-foreground">Use al menos 8 caracteres, que no sean solo números ni parecidos a su nombre o correo.</p>
        <div className="space-y-1.5">
          <label htmlFor="clave-nueva" className="text-xs font-semibold text-muted-foreground">Contraseña nueva</label>
          <input id="clave-nueva" type="password" required minLength={8} autoComplete="new-password" value={clave} onChange={e => setClave(e.target.value)} className={inputCls} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="clave-repetida" className="text-xs font-semibold text-muted-foreground">Repítala</label>
          <input id="clave-repetida" type="password" required minLength={8} autoComplete="new-password" value={repetida} onChange={e => setRepetida(e.target.value)} className={inputCls} />
        </div>
        {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
        <button
          type="submit" disabled={guardando}
          className="w-full py-2.5 bg-ocean-500 hover:bg-ocean-600 disabled:opacity-60 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2"
        >
          {guardando && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
          Guardar contraseña
        </button>
        <Link to="/olvide-clave" className="inline-block text-xs text-muted-foreground hover:text-foreground hover:underline">¿El enlace venció? Pida uno nuevo</Link>
      </form>
    </main>
  )
}
