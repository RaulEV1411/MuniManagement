import { useEffect, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNotificaciones } from '@/hooks/useNotificaciones'
import NotificationPanel from './NotificationPanel'

/** La campana del encabezado; con `enBarra`, el «Avisos» de la barra inferior del celular (abre hacia arriba). */
export default function NotificationBell({ enBarra = false }: { enBarra?: boolean }) {
  const [open, setOpen] = useState(false)
  const { data: notifs = [] } = useNotificaciones()
  const noLeidas = notifs.filter(n => !n.leida).length
  const boton = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!open) return
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); boton.current?.focus() } }
    document.addEventListener('keydown', tecla)
    return () => document.removeEventListener('keydown', tecla)
  }, [open])
  const sinLeer = noLeidas ? `${noLeidas > 99 ? '99+' : noLeidas} ${noLeidas === 1 ? 'notificación sin leer' : 'notificaciones sin leer'}` : ''
  const globo = noLeidas > 0 && (
    <motion.span
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className={enBarra
        ? 'absolute top-1 left-1/2 ml-1 grid min-w-[18px] h-[18px] place-items-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white'
        : 'absolute -top-1 -right-1 grid min-w-[20px] h-5 place-items-center rounded-full bg-red-600 px-1 text-xs font-bold text-white'}
    >
      {noLeidas > 99 ? '99+' : noLeidas}
    </motion.span>
  )

  return (
    <div className="relative">
      {enBarra ? (
        // Sin aria-label: el nombre sale del contenido y así contiene lo que se ve («Avisos 1»), WCAG 2.5.3.
        <button ref={boton} type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
          className="relative flex flex-col items-center justify-center gap-0.5 h-14 w-full text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors">
          <Bell size={20} aria-hidden />
          Avisos
          {globo}
          {noLeidas > 0 && <span className="sr-only">{noLeidas === 1 ? ' notificación sin leer' : ' notificaciones sin leer'}</span>}
        </button>
      ) : (
        <button
          ref={boton}
          type="button"
          onClick={() => setOpen(o => !o)}
          aria-label={sinLeer || 'Notificaciones'}
          className="relative grid h-11 w-11 place-items-center rounded-xl border border-border bg-card hover:bg-accent transition active:scale-95"
        >
          <Bell className="h-5 w-5 text-foreground" />
          {globo}
        </button>
      )}
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className={enBarra
                ? 'fixed inset-x-2 bottom-[calc(4rem_+_env(safe-area-inset-bottom))] z-50 rounded-2xl border border-border bg-popover shadow-2xl overflow-hidden'
                : 'absolute right-0 top-full mt-2 z-50 w-[360px] max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-popover shadow-2xl overflow-hidden'}
            >
              <NotificationPanel onClose={() => setOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
