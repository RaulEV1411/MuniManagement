import { useState } from 'react'
import { Bell } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNotificaciones } from '@/hooks/useNotificaciones'
import NotificationPanel from './NotificationPanel'

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const { data: notifs = [] } = useNotificaciones()
  const noLeidas = notifs.filter(n => !n.leida).length

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-label={`Notificaciones${noLeidas ? ` (${noLeidas} sin leer)` : ''}`}
        className="relative grid h-11 w-11 place-items-center rounded-xl border border-border bg-card hover:bg-accent transition active:scale-95"
      >
        <Bell className="h-5 w-5 text-foreground" />
        {noLeidas > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 grid min-w-[20px] h-5 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white"
          >
            {noLeidas > 99 ? '99+' : noLeidas}
          </motion.span>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 z-50 w-[360px] max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-popover shadow-2xl overflow-hidden"
            >
              <NotificationPanel onClose={() => setOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
