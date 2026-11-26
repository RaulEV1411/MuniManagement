import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, X, Sparkles, Bell, ListChecks, DollarSign, ShieldCheck, HelpCircle, type LucideIcon } from 'lucide-react'
import { useOnboardingTour } from '@/hooks/useOnboardingTour'

interface Step {
  icon: LucideIcon
  title: string
  body: string
}

const STEPS: Step[] = [
  {
    icon: Sparkles,
    title: 'Le damos la bienvenida a MuniManagement',
    body: 'Esta plataforma le permite gestionar proyectos, tareas y presupuestos municipales. Le mostramos lo principal en menos de un minuto.',
  },
  {
    icon: Bell,
    title: 'Reciba avisos automáticos',
    body: 'En la campana de la parte superior verá un aviso cuando un proyecto o una tarea esté por vencer: desde 4 días antes y cada día, hasta que se cierre.',
  },
  {
    icon: ListChecks,
    title: 'Cambie estados con un clic',
    body: 'Entre a un proyecto y, en la pestaña Información, haga clic en cualquiera de las píldoras (Pendiente, En progreso, Completado…) para cambiar el estado. Si lo pausa o lo cancela, se le pedirá un motivo.',
  },
  {
    icon: DollarSign,
    title: 'Registre aumentos y rebajos',
    body: 'En la sección Presupuesto del proyecto puede registrar ajustes (+ o −) con su motivo. Todo queda en el historial.',
  },
  {
    icon: ShieldCheck,
    title: 'Delegue la supervisión cuando lo necesite',
    body: 'Las jefaturas pueden delegar la supervisión de un proyecto en otra persona de su área. Sirve para vacaciones, comisiones o acompañamientos puntuales.',
  },
  {
    icon: HelpCircle,
    title: '¿Dudas? Visite Ayuda',
    body: 'En el menú lateral está la sección Ayuda, con preguntas frecuentes y un botón para volver a ver este recorrido cuando quiera.',
  },
]

export default function OnboardingTour() {
  const { show, finish } = useOnboardingTour()
  const [idx, setIdx] = useState(0)
  if (!show) return null
  const step = STEPS[idx]
  const Icon = step.icon
  const last = idx === STEPS.length - 1

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] grid place-items-center bg-black/60 p-4">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-md rounded-3xl bg-card p-7 shadow-2xl relative"
        >
          <button
            onClick={finish}
            aria-label="Cerrar el recorrido"
            className="absolute top-3 right-3 p-2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-ocean-500/10 text-ocean-500 dark:text-ocean-200 mb-4">
            <Icon className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">{step.title}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{step.body}</p>

          <div className="mt-6 flex items-center justify-between">
            <div className="flex gap-1.5">
              {STEPS.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i === idx ? 'w-6 bg-ocean-500' : 'w-1.5 bg-muted'
                  }`}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={finish}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Saltar
              </button>
              <button
                onClick={() => (last ? finish() : setIdx(i => i + 1))}
                className="inline-flex items-center gap-1.5 rounded-lg bg-ocean-500 px-4 py-2 text-sm font-semibold text-white hover:bg-ocean-600"
              >
                {last ? 'Listo' : 'Siguiente'} <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
