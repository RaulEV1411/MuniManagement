import { useState } from 'react'
import { HelpCircle, ChevronDown, BookOpen, MessageCircle, Phone, Mail, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/store/app'
import { useMarca, useTituloDePagina } from '@/hooks/useMarca'
import { Link } from 'react-router-dom'

interface FAQ {
  q: string
  a: string
}

const FAQS: FAQ[] = [
  {
    q: '¿Cómo cambio el estado de un proyecto o tarea?',
    a: 'Abra el proyecto, vaya a la pestaña Información y haga clic en cualquiera de las «píldoras» de estado (Pendiente, En progreso, etc.). Si elige Pausado, se le pedirá un motivo, que queda en el historial. Completado y Cancelado abren el cierre del proyecto.',
  },
  {
    q: '¿Cómo cierro un proyecto? ¿Se puede borrar?',
    a: 'Los proyectos no se borran. Con «Cerrar proyecto» se indica cómo terminó (Completado o Cancelado), la fecha y el costo reales, un resumen o motivo, las lecciones aprendidas y, si hay, el acta en PDF. Un proyecto cerrado pasa a la pestaña Finalizados y no se edita: para cambiarlo, quien tiene permiso lo reabre con un motivo. El Administrador puede archivar los cerrados para sacarlos de las listas sin perder su historial.',
  },
  {
    q: '¿Cómo solicito un aumento o rebajo de presupuesto?',
    a: 'En la pestaña Información del proyecto, busque la sección «Presupuesto» y presione «Ajuste». Indique si es aumento o rebajo, el monto y el motivo. Queda registrado en el historial y se le avisa al responsable.',
  },
  {
    q: '¿Cómo delego la supervisión de un proyecto?',
    a: 'Pueden delegar la alcaldía y el Administrador en cualquier proyecto, y las jefaturas de dirección o de departamento en los proyectos de su área. En la pestaña Información del proyecto, abra «Supervisión delegada», elija a la persona e indique si puede editar o solo ver.',
  },
  {
    q: '¿Cuándo recibo notificaciones?',
    a: 'Le llega un correo y un aviso en la campana superior cuando un proyecto o una tarea está a 4 días o menos de su fecha de entrega. El aviso se repite cada día, también después de la fecha, hasta que se complete o se cancele.',
  },
  {
    q: '¿Quién puede ver mis proyectos?',
    a: 'Lo ven las personas involucradas: el responsable, quienes tienen tareas asignadas, las jefaturas y los delegados. Además, los proyectos marcados como públicos aparecen en el portal (/publico), donde la ciudadanía ve el avance sin montos ni datos de personas.',
  },
  {
    q: '¿Puedo modificar los estados o prioridades?',
    a: 'No. Los estados (Pendiente, En progreso, En revisión, Completado, Pausado, Cancelado) y las prioridades (Baja, Media, Alta, Urgente) los define el sistema, para que todos los proyectos se lean igual. Los tipos de proyecto sí los administra el Administrador en Configuración.',
  },
]

export default function AyudaPage() {
  useTituloDePagina('Ayuda')
  const marca = useMarca()
  const setTourForzado = useAppStore(s => s.setTourForzado)
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
          <BookOpen className="h-5 w-5 text-ocean-500 dark:text-ocean-200 mb-2" />
          <p className="font-semibold text-sm">Preguntas frecuentes</p>
          <p className="text-xs text-muted-foreground">Respuestas a dudas comunes.</p>
        </a>
        <button
          onClick={() => setTourForzado(true)}
          className="text-left rounded-2xl bg-card border border-border p-4 hover:border-foreground/30 transition"
        >
          <Sparkles className="h-5 w-5 text-ocean-500 dark:text-ocean-200 mb-2" />
          <p className="font-semibold text-sm">Ver el recorrido guiado</p>
          <p className="text-xs text-muted-foreground">Conozca las funciones principales.</p>
        </button>
        {marca.correo_soporte && (
          <a href={`mailto:${marca.correo_soporte}`} className="rounded-2xl bg-card border border-border p-4 hover:border-foreground/30 transition">
            <MessageCircle className="h-5 w-5 text-ocean-500 dark:text-ocean-200 mb-2" />
            <p className="font-semibold text-sm">Contactar soporte</p>
            <p className="text-xs text-muted-foreground">Escríbanos un correo.</p>
          </a>
        )}
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

      {/* Los datos de contacto los carga el Administrador en Configuración › Institución. */}
      {(marca.correo_soporte || marca.telefono_soporte) && (
        <section className="mt-10 rounded-2xl border border-border bg-card p-5">
          <h2 className="text-lg font-bold text-foreground mb-3">¿Necesita más ayuda?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {marca.correo_soporte && (
              <a href={`mailto:${marca.correo_soporte}`} className="flex items-center gap-3 rounded-xl border border-border p-3 hover:bg-accent transition">
                <Mail className="h-5 w-5 text-ocean-500 dark:text-ocean-200" />
                <div>
                  <p className="text-sm font-medium">Correo de soporte</p>
                  <p className="text-xs text-muted-foreground">{marca.correo_soporte}</p>
                </div>
              </a>
            )}
            {marca.telefono_soporte && (
              <a href={`tel:${marca.telefono_soporte.replace(/[^\d+]/g, '')}`} className="flex items-center gap-3 rounded-xl border border-border p-3 hover:bg-accent transition">
                <Phone className="h-5 w-5 text-ocean-500 dark:text-ocean-200" />
                <div>
                  <p className="text-sm font-medium">Teléfono</p>
                  <p className="text-xs text-muted-foreground">{marca.telefono_soporte}{marca.horario_soporte ? ` (${marca.horario_soporte})` : ''}</p>
                </div>
              </a>
            )}
          </div>
        </section>
      )}

      <p className="mt-8 text-xs text-muted-foreground">
        Si algo no se puede usar con el teclado o con un lector de pantalla, vea la{' '}
        <Link to="/accesibilidad" className="underline hover:text-foreground">declaración de accesibilidad</Link>.
      </p>
    </div>
  )
}
