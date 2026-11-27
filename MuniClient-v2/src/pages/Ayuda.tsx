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
    q: '¿Qué datos míos guarda el sistema y cómo los veo?',
    a: 'El aviso de privacidad (enlace en el ingreso y en el portal) dice qué datos se usan, para qué, quién más los trata y cómo ejercer sus derechos. En su perfil, «Mis datos» descarga todo lo que el sistema guarda de usted, en PDF o JSON. Para corregir la identificación, el correo, el rol o el departamento, pídalo a su jefatura; para dar de baja y anonimizar su cuenta, al Administrador.',
  },
  {
    q: '¿Cómo pido más plazo, presupuesto o personal?',
    a: 'En el proyecto, pestaña Solicitudes, «Nueva solicitud»: elija qué pide (prórroga, aumento o rebajo de presupuesto, más personal, cambio de responsable, de alcance u otro) y explique por qué. La aprueban, en orden, las jefaturas que correspondan al monto o a los días; si nadie responde a tiempo, también la puede decidir el nivel siguiente. Mientras tanto el proyecto sigue. Al aprobarse, el cambio se aplica solo y queda en el historial. Las que le toca decidir están en Solicitudes › Por aprobar.',
  },
  {
    q: '¿Cómo cierro un proyecto? ¿Se puede borrar?',
    a: 'Los proyectos no se borran. Con «Cerrar proyecto» se indica cómo terminó (Completado o Cancelado), la fecha y el costo reales, un resumen o motivo, las lecciones aprendidas y, si hay, el acta en PDF. Un proyecto cerrado pasa a la pestaña Finalizados y no se edita: para cambiarlo, quien tiene permiso lo reabre con un motivo. El Administrador puede archivar los cerrados para sacarlos de las listas sin perder su historial.',
  },
  {
    q: '¿Dónde anoto el expediente, el número de SICOP, los hitos y los riesgos?',
    a: 'En la pestaña Información del proyecto. «Editar ficha» guarda el código o expediente (no se repite entre proyectos), el número de SICOP, la fuente de financiamiento, el distrito, el punto en el mapa (latitud y longitud), el objetivo, los beneficiarios estimados y los indicadores con su meta y lo logrado. El proyecto también se encuentra buscando su código o su número de SICOP. En Hitos se agregan las fechas clave y se marcan cumplidas; en Riesgos se anota qué puede pasar, con su probabilidad e impacto (el nivel se calcula solo), cómo se mitiga y quién está a cargo. Los cambia quien puede editar el proyecto.',
  },
  {
    q: '¿Cómo hago que un tipo de proyecto traiga sus tareas?',
    a: 'En Configuración › Tipos, debajo de la lista, elija el tipo y agregue sus tareas: a cuántos días del inicio empiezan, cuánto duran y los pasos de su lista de verificación. Al crear un proyecto de ese tipo, el asistente ofrece crearlas y les pone las fechas desde el inicio del proyecto, sin pasar de la entrega. Los proyectos ya creados no cambian. Las fuentes de financiamiento se administran en Configuración › Financiamiento y los distritos, en Configuración › Institución.',
  },
  {
    q: '¿Cómo registro unas vacaciones, una incapacidad o un permiso?',
    a: 'En el perfil de la persona, pestaña Información, sección «Disponibilidad y carga»: elija el tipo y las fechas y pulse «Registrar ausencia». La registra la persona, quien administra su cuenta o su jefatura. Si tiene proyectos abiertos a cargo, el sistema avisa a la jefatura y sugiere delegarlos: en el equipo de cada proyecto, agregue a alguien como Supervisor por esas fechas. Las demás personas solo ven «Ausente hasta el …», sin el motivo. La misma sección muestra su carga: tareas abiertas, vencidas, horas pendientes y proyectos a cargo.',
  },
  {
    q: '¿Quién decide cuando la jefatura está ausente?',
    a: 'En Departamentos o Direcciones, «Más datos» permite elegir una persona suplente. Mientras la jefatura tiene una ausencia registrada, la suplencia puede lo mismo que ella, pero solo en ese departamento o esa dirección: ve y edita sus proyectos, aprueba sus solicitudes y recibe sus avisos. Al terminar la ausencia, vuelve todo a la normalidad sin hacer nada. Ahí mismo se anotan el código, la descripción, el presupuesto anual, el contacto y las metas del año.',
  },
  {
    q: '¿Cómo hago que una persona que sabe topografía aparezca al asignar tareas?',
    a: 'Cree la especialidad en Configuración › Especialidades. Después, cada persona la marca en su perfil (Editar). Al asignar una tarea, la lista de personas muestra sus especialidades, sus tareas abiertas y si está ausente. El número de empleado y la fecha de ingreso los anota quien administra las cuentas.',
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
    a: 'Lo ven las personas involucradas: el responsable, quienes tienen tareas asignadas, las jefaturas y los delegados. Además, los proyectos marcados como públicos aparecen en el portal (/publico), donde la ciudadanía ve el avance, el presupuesto y lo ejecutado, sin datos de personas.',
  },
  {
    q: '¿Puedo modificar los estados o prioridades?',
    a: 'Los estados del sistema (Pendiente, En progreso, En revisión, Completado, Pausado, Cancelado) y las prioridades (Baja, Media, Alta, Urgente) no se modifican, para que todos los proyectos se lean igual. El Administrador puede agregar estados propios en Configuración eligiendo su categoría (Activo, Pausado o Finalizado), y también administra los tipos de proyecto.',
  },
  {
    q: '¿Cómo pido un dato que el sistema no trae?',
    a: 'En Configuración › Campos, el Administrador crea el campo: dónde se pide (proyectos o tareas), el tipo de dato (texto, número, fecha, lista o sí o no), si es obligatorio y para qué tipos de proyecto. Aparece en «Datos adicionales» al crear el proyecto o la tarea, en «Editar ficha» y en la edición de la tarea. Las tareas usan el tipo de su proyecto.',
  },
  {
    q: '¿Qué pasa si un campo ya no se necesita?',
    a: 'Desactívelo en Configuración › Campos: deja de pedirse, pero lo que ya se cargó se sigue viendo. Un campo con datos no se borra ni cambia de tipo de dato; si hace falta otro tipo, cree un campo nuevo.',
  },
  {
    q: '¿Qué muestra el portal público y cómo marco la ubicación de un proyecto?',
    a: 'El portal muestra los proyectos marcados como públicos: avance, presupuesto aprobado y ejecutado, número de SICOP, distrito, ubicación en el mapa, tareas y fotos. Los cancelados y completados siguen ahí con su cierre (fecha, costo final y motivo); las lecciones aprendidas y los nombres de las personas no se publican. Un proyecto cerrado no se edita, pero «Quitar del portal» lo saca de ahí sin reabrirlo. La ubicación se marca en «Editar ficha»: toque el mapa, busque una dirección o escriba la latitud y la longitud. El portal también ofrece todo para descargar en CSV y JSON con la licencia que se elige en Configuración › Institución, donde se marca además el centro del mapa.',
  },
  {
    q: '¿Dónde veo todas mis tareas?',
    a: 'En «Mis tareas» (menú lateral; en el celular, en la barra de abajo): las tareas abiertas que tiene asignadas o en que colabora, de todos sus proyectos, agrupadas por vencidas, próximos 7 días y más adelante (sin las de proyectos cerrados o archivados). Al tocar una se abre en su proyecto.',
  },
  {
    q: '¿Cómo ordeno la lista de proyectos o de usuarios y elijo qué columnas ver?',
    a: 'En la vista de lista, toque el título de una columna para ordenar por ella; otra vez, al revés. «Columnas» deja mostrar u ocultar columnas (se recuerda en este navegador) y abajo se elige cuántas filas ver por página. En el celular la lista se ve como tarjetas.',
  },
  {
    q: '¿Qué muestran los rombos y el recuadro del cronograma?',
    a: 'Cada rombo es un hito del proyecto en su fecha prevista: blanco si está previsto, verde si se cumplió y rojo si está atrasado. Al pasar el puntero o llegar con el teclado a un proyecto se abre un resumen con fechas, avance, responsable, presupuesto, solicitudes abiertas e hitos; Escape lo cierra. En Reportes, el nombre del proyecto muestra el mismo resumen.',
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
