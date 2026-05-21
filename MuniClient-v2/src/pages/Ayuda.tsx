import { useState } from 'react'
import { HelpCircle, ChevronDown, BookOpen, MessageCircle, Phone, Mail, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface FAQ {
  q: string
  a: string
}

const FAQS: FAQ[] = [
  {
    q: '¿Cómo cambio el estado de un proyecto o tarea?',
    a: 'Abre el proyecto, ve a la pestaña Información y haz clic en cualquiera de las "píldoras" de estado (Pendiente, En progreso, etc.). Si eliges Cancelado o Pausado, te pediremos un motivo que quedará en el historial.',
  },
  {
    q: '¿Cómo solicito un aumento o rebajo de presupuesto?',
    a: 'En la pestaña Información del proyecto, busca la sección "Presupuesto" y presiona "Ajuste". Indica si es aumento o rebajo, el monto en colones y un motivo. Quedará registrado y se notificará al responsable.',
  },
  {
    q: '¿Cómo delego la supervisión de un proyecto a un compañero?',
    a: 'Solo los roles Alcalde, Vicealcalde, Jefe de Dirección y Jefe de Departamento pueden delegar. En la pestaña Información del proyecto, abre "Supervisión delegada" y elige a la persona y si puede editar o solo ver.',
  },
  {
    q: '¿Cuándo recibo notificaciones?',
    a: 'Recibirás un correo y verás una notificación en la campana superior cuando un proyecto o tarea esté a 4 días o menos de su fecha de entrega. Los avisos se repiten diariamente hasta el vencimiento.',
  },
  {
    q: '¿Quién puede ver mis proyectos?',
    a: 'Los proyectos son visibles para los usuarios involucrados (responsable, asignados, jefes y delegados). Existe también un portal público en /publico donde la ciudadanía puede ver el avance sin información sensible (sin montos ni datos de personas).',
  },
  {
    q: '¿Puedo modificar los estados o prioridades?',
    a: 'No. Los estados (Pendiente, En progreso, En revisión, Completado, Pausado, Cancelado) y las prioridades (Baja, Media, Alta, Urgente) son definidos por el sistema para mantener consistencia entre todos los proyectos.',
  },
]

export default function AyudaPage() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <header className="flex items-center gap-3 mb-6">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-ocean-500 text-white">
          <HelpCircle className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Centro de ayuda</h1>
          <p className="text-sm text-muted-foreground">Guías rápidas y respuestas a las preguntas más comunes.</p>
        </div>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
        <a href="#faqs" className="rounded-2xl bg-card border border-border p-4 hover:border-foreground/30 transition">
          <BookOpen className="h-5 w-5 text-ocean-500 mb-2" />
          <p className="font-semibold text-sm">Preguntas frecuentes</p>
          <p className="text-xs text-muted-foreground">Respuestas a dudas comunes.</p>
        </a>
        <button
          onClick={() => { localStorage.removeItem('muni-onboarding-done'); location.reload() }}
          className="text-left rounded-2xl bg-card border border-border p-4 hover:border-foreground/30 transition"
        >
          <Sparkles className="h-5 w-5 text-ocean-500 mb-2" />
          <p className="font-semibold text-sm">Ver tour guiado</p>
          <p className="text-xs text-muted-foreground">Recorre las funciones principales.</p>
        </button>
        <a href="mailto:soporte@muni.local" className="rounded-2xl bg-card border border-border p-4 hover:border-foreground/30 transition">
          <MessageCircle className="h-5 w-5 text-ocean-500 mb-2" />
          <p className="font-semibold text-sm">Contactar soporte</p>
          <p className="text-xs text-muted-foreground">Envíanos un correo.</p>
        </a>
      </section>

      <section id="faqs" className="space-y-2">
        <h2 className="text-lg font-bold text-foreground mb-3">Preguntas frecuentes</h2>
        {FAQS.map((f, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card overflow-hidden">
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="flex items-center justify-between w-full px-4 py-4 text-left hover:bg-accent transition"
              aria-expanded={open === i}
            >
              <span className="font-medium text-foreground">{f.q}</span>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open === i ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence initial={false}>
              {open === i && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  <p className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed">{f.a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </section>

      <section className="mt-10 rounded-2xl border border-border bg-card p-5">
        <h2 className="text-lg font-bold text-foreground mb-3">¿Necesitas más ayuda?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <a href="mailto:soporte@muni.local" className="flex items-center gap-3 rounded-xl border border-border p-3 hover:bg-accent transition">
            <Mail className="h-5 w-5 text-ocean-500" />
            <div>
              <p className="text-sm font-medium">Correo de soporte</p>
              <p className="text-xs text-muted-foreground">soporte@muni.local</p>
            </div>
          </a>
          <a href="tel:+50625000000" className="flex items-center gap-3 rounded-xl border border-border p-3 hover:bg-accent transition">
            <Phone className="h-5 w-5 text-ocean-500" />
            <div>
              <p className="text-sm font-medium">Teléfono</p>
              <p className="text-xs text-muted-foreground">2500-0000 (lun-vie 8am-4pm)</p>
            </div>
          </a>
        </div>
      </section>
    </div>
  )
}
