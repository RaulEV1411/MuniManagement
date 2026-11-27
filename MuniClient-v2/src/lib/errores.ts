import axios from 'axios'

// Nombres legibles para los campos que el servidor devuelve en los errores de validación.
const CAMPOS: Record<string, string> = {
  name: 'Nombre', descripcion: 'Descripción', fecha_inicio: 'Fecha de inicio', fecha_entrega: 'Fecha de entrega',
  costo: 'Costo', estado_ID: 'Estado', prioridad_ID: 'Prioridad', departamento_ID: 'Departamento',
  user_ID: 'Responsable', asignado_a: 'Responsable', razon: 'Motivo', motivo: 'Motivo', monto: 'Monto',
  first_name: 'Nombre', last_name: 'Apellido', email: 'Correo', cedula: 'Identificación', tipo_identificacion: 'Tipo de identificación', phone_number: 'Teléfono',
  birthday: 'Fecha de nacimiento', puesto: 'Puesto', role: 'Rol', supervisor: 'Supervisor', jefe: 'Jefe',
  direccion: 'Dirección', proyecto_ID: 'Proyecto', proyecto: 'Proyecto', tarea: 'Tarea',
}

/** El mensaje que conviene mostrar para un error de la API. */
export function mensajeDeError(err: unknown, porDefecto: string): string {
  if (!axios.isAxiosError(err)) return porDefecto
  if (!err.response) return 'No hay conexión con el servidor. Revise su internet e inténtelo de nuevo.'
  const { status, data } = err.response
  if (data && typeof data === 'object') {
    if (typeof data.error === 'string') return data.error
    if (typeof data.detail === 'string') return data.detail
    for (const [campo, valor] of Object.entries(data)) {
      const texto = Array.isArray(valor) ? valor[0] : valor
      if (typeof texto !== 'string') continue
      const etiqueta = CAMPOS[campo]
      return campo === 'non_field_errors' || !etiqueta ? texto : `${etiqueta}: ${texto}`
    }
  }
  if (status >= 500) return 'El servidor tuvo un problema. Inténtelo de nuevo en unos minutos.'
  if (status === 403) return 'No tiene permisos para hacer esto.'
  return porDefecto
}

export function esNoEncontrado(err: unknown): boolean {
  return axios.isAxiosError(err) && err.response?.status === 404
}
