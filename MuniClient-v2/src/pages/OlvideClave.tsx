import { useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { Loader2 } from 'lucide-react'
import { olvideClave } from '@/lib/api'

export default function OlvideClavePage() {
  const [email, setEmail] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    setEnviando(true)
    setError(null)
    try {
      const r = await olvideClave(email.trim())
      setMensaje(r.mensaje)
    } catch (err) {
      setError(axios.isAxiosError(err) && err.response?.data?.error
        ? err.response.data.error
        : 'No se pudo enviar el correo. Inténtelo de nuevo en unos minutos.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl p-6 space-y-4">
        <h1 className="text-lg font-bold text-foreground">Recuperar contraseña</h1>
        {mensaje ? (
          <p className="text-sm text-foreground" role="status">{mensaje}</p>
        ) : (
          <form onSubmit={enviar} className="space-y-4">
            <p className="text-sm text-muted-foreground">Escriba su correo y le enviaremos un enlace para definir una contraseña nueva.</p>
            <div className="space-y-1.5">
              <label htmlFor="olvide-email" className="text-xs font-semibold text-muted-foreground">Correo</label>
              <input
                id="olvide-email" type="email" required autoComplete="email" value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-background border border-input rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
            <button
              type="submit" disabled={enviando}
              className="w-full py-2.5 bg-ocean-500 hover:bg-ocean-600 disabled:opacity-60 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2"
            >
              {enviando && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
              Enviar enlace
            </button>
          </form>
        )}
        <Link to="/login" className="inline-block text-xs text-muted-foreground hover:text-foreground hover:underline">Volver a iniciar sesión</Link>
      </div>
    </main>
  )
}
