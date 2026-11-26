import { Link } from 'react-router-dom'
import LogoInstitucion from '@/components/common/LogoInstitucion'
import { useMarca, useTituloDePagina } from '@/hooks/useMarca'

// Fecha de la última evaluación completa (axe-core en las páginas principales y revisión con teclado).
const ULTIMA_REVISION = '25 de noviembre de 2026'

export default function AccesibilidadPage() {
  useTituloDePagina('Accesibilidad')
  const marca = useMarca()

  return (
    <div className="min-h-full bg-background">
      <header className="bg-ocean-500 text-white">
        <div className="max-w-3xl mx-auto px-6 py-8">
          <div className="flex items-center gap-3 mb-2">
            <LogoInstitucion tamano={36} claro />
            <h1 className="text-2xl font-bold">Declaración de accesibilidad</h1>
          </div>
          <p className="text-white">{marca.nombre}</p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-8 text-sm leading-relaxed text-foreground">
        <section className="space-y-2">
          <h2 className="text-lg font-bold">Compromiso</h2>
          <p>
            {marca.nombre} quiere que este sistema lo pueda usar cualquier persona, también con lector de pantalla,
            solo con el teclado o con la pantalla ampliada. El objetivo es cumplir las Pautas de Accesibilidad para el
            Contenido Web (WCAG) 2.2, nivel AA.
          </p>
          <p>
            <strong>Estado:</strong> cumple parcialmente. La mayor parte del sistema cumple, con las excepciones que se
            detallan más abajo.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold">Qué se cuida</h2>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Todo se puede usar con el teclado. Al inicio de cada página, un enlace permite saltar el menú.</li>
            <li>Los textos y los controles tienen un contraste de al menos 4,5:1, en modo claro y en modo oscuro. El color de la institución se valida al configurarlo.</li>
            <li>Los campos, los botones y los diálogos tienen nombre para los lectores de pantalla. Los diálogos mantienen el foco adentro y se cierran con Escape.</li>
            <li>Cada página tiene su propio título y el idioma declarado.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold">Limitaciones conocidas</h2>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Los PDF y Excel que se exportan en Reportes no están etiquetados para lectores de pantalla.</li>
            <li>Las fotos que suben las personas usuarias no tienen una descripción.</li>
            <li>Los gráficos no tienen una versión en tabla. Los totales del panel de proyectos también se muestran como texto.</li>
            <li>El tablero de tareas se ordena arrastrando las tarjetas. Con el teclado, el estado de cada tarea se cambia desde su selector.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold">Cómo se revisa</h2>
          <p>
            Cada cambio del sistema pasa por una revisión automática con axe-core en las páginas principales, en modo
            claro y en modo oscuro, y por pruebas de uso con el teclado. Última revisión completa: {ULTIMA_REVISION}.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold">Si encuentra una barrera</h2>
          <p>
            {marca.correo_soporte
              ? <>Escríbanos a <a className="font-semibold text-ocean-500 dark:text-ocean-200 underline" href={`mailto:${marca.correo_soporte}`}>{marca.correo_soporte}</a>{marca.telefono_soporte ? <> o llame al {marca.telefono_soporte}</> : null}. Indique en qué página estaba y qué intentaba hacer.</>
              : <>Comuníquese con la oficina de soporte de la institución e indique en qué página estaba y qué intentaba hacer.</>}
          </p>
        </section>

        <p className="text-xs text-muted-foreground">
          <Link to="/login" className="underline">Volver al inicio de sesión</Link>
          {' · '}
          <Link to="/publico" className="underline">Portal de proyectos</Link>
        </p>
      </main>
    </div>
  )
}
