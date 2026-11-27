import type { Marca } from '@/lib/marca'

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="space-y-1.5">
      <h2 className="text-sm font-bold text-foreground">{titulo}</h2>
      <div className="text-sm text-foreground/90 space-y-1.5 leading-relaxed">{children}</div>
    </section>
  )
}

/** El aviso de privacidad (Ley 8968, art. 5): quién es responsable, qué datos, para qué, quién más los
 * trata y cómo ejercer los derechos. La institución agrega su propio texto en Configuración. */
export default function TextoDelAviso({ marca }: { marca: Marca }) {
  const contacto = [marca.correo_soporte, marca.telefono_soporte].filter(Boolean).join(' · ')
  const anios = Math.round(marca.retencion_auditoria_dias / 365)
  return (
    <div className="space-y-5">
      <Seccion titulo="Quién es responsable de sus datos">
        <p>{marca.nombre}{marca.ubicacion ? `, ${marca.ubicacion}` : ''}{contacto ? `. Contacto: ${contacto}` : ''}.</p>
      </Seccion>
      <Seccion titulo="Qué datos se usan">
        <p>Nombre y apellidos, tipo y número de identificación, correo, teléfono, puesto, rol y departamento; la foto y la fecha de nacimiento solo si usted o su jefatura las agregan.</p>
        <p>Además, para la seguridad del sistema: las sesiones (inicio, última actividad, dirección IP y navegador) y lo que cada persona hace en él.</p>
      </Seccion>
      <Seccion titulo="Para qué">
        <p>Gestionar los proyectos y las tareas de la institución, asignar responsables, enviar avisos por correo, dar seguimiento a las solicitudes y llevar la auditoría.</p>
        <p>El portal público muestra los proyectos sin datos de personas.</p>
      </Seccion>
      <Seccion titulo="Cuánto tiempo se guardan">
        <p>Las cuentas no se borran: se dan de baja, para conservar el historial de los proyectos. Los registros de auditoría y las sesiones se conservan {anios >= 1 ? `${anios} año${anios === 1 ? '' : 's'}` : `${marca.retencion_auditoria_dias} días`} y después se borran solos.</p>
      </Seccion>
      <Seccion titulo="Quién más trata sus datos">
        {marca.encargados.length === 0 ? (
          <p>Por ahora, nadie fuera de la institución.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">Encargados del tratamiento</caption>
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="py-1 pr-3 font-semibold">Proveedor</th>
                  <th className="py-1 pr-3 font-semibold">Qué datos</th>
                  <th className="py-1 pr-3 font-semibold">Para qué</th>
                  <th className="py-1 font-semibold">País</th>
                </tr>
              </thead>
              <tbody>
                {marca.encargados.map((e, i) => (
                  <tr key={i} className="border-t border-border align-top">
                    <td className="py-1.5 pr-3 font-medium">{e.nombre}</td>
                    <td className="py-1.5 pr-3">{e.datos}</td>
                    <td className="py-1.5 pr-3">{e.finalidad}</td>
                    <td className="py-1.5">{e.pais}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Seccion>
      <Seccion titulo="Sus derechos">
        <p><strong>Acceso:</strong> en su perfil puede descargar todos sus datos («Mis datos»).</p>
        <p><strong>Rectificación:</strong> puede corregir su nombre, teléfono y puesto en su perfil; la identificación, el correo, el rol y el departamento los corrige su jefatura o el Administrador.</p>
        <p><strong>Supresión:</strong> puede pedir que su cuenta se dé de baja y se anonimice{contacto ? ` (${contacto})` : ''}. Algunos registros se conservan cuando una ley lo exige.</p>
        <p>Si considera que sus datos no se tratan bien, puede acudir a la Agencia de Protección de Datos de los Habitantes (PRODHAB).</p>
      </Seccion>
      {marca.aviso_privacidad.trim() && (
        <Seccion titulo={`Además, ${marca.nombre} informa`}>
          <p className="whitespace-pre-line">{marca.aviso_privacidad}</p>
        </Seccion>
      )}
      <p className="text-xs text-muted-foreground">
        Versión {marca.privacidad_version}{marca.privacidad_actualizada ? `, actualizada el ${new Date(marca.privacidad_actualizada).toLocaleDateString('es-CR')}` : ''}.
      </p>
    </div>
  )
}
