export type Alcance = 'propio' | 'departamento' | 'direccion' | 'todos'

export interface Role {
  role_ID: string
  name: string
  descripcion?: string
  is_system?: boolean
  // {permiso: alcance}; el Administrador siempre tiene todo.
  permisos?: Record<string, Alcance>
  // Si puede sumarse al equipo de proyectos de otros (equipo.integrar).
  integra_equipos?: boolean
}

export interface CatalogoPermisos {
  modulos: Array<{ codigo: string; nombre: string }>
  permisos: Array<{ codigo: string; modulo: string; etiqueta: string; admite_alcance: boolean; en_proyecto: boolean }>
  alcances: Array<{ codigo: Alcance; etiqueta: string }>
}

export interface RolProyecto {
  rol_proyecto_ID: string
  nombre: string
  descripcion: string
  permisos: string[]
  is_system: boolean
  orden: number
}

export interface Direction {
  direccion_ID: string
  name: string
  jefe?: string | null
}

export interface Department {
  departamentos_ID: string
  name: string
  direccion: Direction | string | null
  jefe?: string | null
}

export interface User {
  user_ID: string
  first_name: string
  last_name: string
  email: string
  cedula: number
  phone_number: number
  puesto: string
  birthday: string
  user_photo: string | null
  role: Role
  departamento_ID: Department
  // Solo para quien ve la ficha completa: la última actividad de sus sesiones.
  ultima_conexion?: string | null
}

export interface Estado {
  estado_ID: string
  name: string
  color?: string
  orden?: number
  is_system?: boolean
}

export interface Prioridad {
  prioridad_ID: string
  name: string
  color?: string
  orden?: number
  is_system?: boolean
}

export interface Tipo {
  tipos_ID: string
  name: string
}

export interface ProjectImage {
  imagen_ID: string
  url: string
  public_id: string
  created_at: string
}

export interface Project {
  proyect_ID: string
  name: string
  descripcion: string
  fecha_inicio: string
  fecha_entrega: string
  costo: number
  estado_ID: Estado
  prioridad_ID: Prioridad
  departamento_ID: Department
  user_ID: User
  images: ProjectImage[]
  es_publico?: boolean
  costo_total?: number
  created_at?: string
  tipos?: Array<{ tipos_ID: string; name: string }>
  // Solo en el detalle: lo que puede hacer quien lo mira (proyectos.editar, tareas.gestionar, …).
  mis_permisos?: string[] | null
}

export interface TaskImage {
  imagen_ID: string
  url: string
  public_id: string
  created_at: string
}

export interface Task {
  tareas_ID: string
  name: string
  descripcion: string
  fecha_inicio: string
  fecha_entrega: string
  estado_ID: Estado
  prioridad_ID: Prioridad
  proyecto_ID: string
  asignado_a: Pick<User, 'user_ID' | 'first_name' | 'last_name' | 'user_photo'> | null
  images: TaskImage[]
}

export interface Feedback {
  feed_ID: string
  proyecto_ID: string
  info: string
  user_ID: Pick<User, 'user_ID' | 'first_name' | 'last_name' | 'user_photo'> | null
  created_at: string | null
}

export interface HistorialEntry {
  historial_ID: string
  tipo: string
  tipo_display: string
  proyecto_ID: string | null
  tarea_ID: string
  usuario: Pick<User, 'user_ID' | 'first_name' | 'last_name' | 'user_photo'> | null
  razon: string
  datos_anteriores: Record<string, string> | null
  datos_nuevos: Record<string, string> | null
  created_at: string
}

export interface AuthTokens {
  access: string
  refresh: string
  role: string
  user_photo: string | null
  user_ID: string
}

export interface Notificacion {
  notificacion_ID: string
  usuario: string
  tipo: string
  titulo: string
  mensaje: string
  link: string
  leida: boolean
  created_at: string
}

export interface MiembroProyecto {
  miembro_ID: string
  proyecto: string
  usuario: string
  rol: string
  desde: string
  hasta: string | null
  motivo: string
  activo: boolean
  otorgado_por: string | null
  creado_en: string
  revocado_en: string | null
  usuario_info?: User
  otorgado_por_info?: User
  rol_info?: RolProyecto
  vigente: boolean
  dias_restantes: number | null
}

export interface AjustePresupuesto {
  ajuste_ID: string
  proyecto: string | null
  tarea: string | null
  tipo: 'aumento' | 'rebajo'
  monto: number
  motivo: string
  usuario: string
  aprobado_por: string | null
  fecha: string
  usuario_info?: User
}

export interface PublicProject {
  proyect_ID: string
  name: string
  descripcion: string
  fecha_inicio: string
  fecha_entrega: string
  estado: { name: string; color: string } | null
  prioridad: { name: string; color: string } | null
  departamento: string
  direccion: string
  images: Array<{ imagen_ID: string; url: string }>
  avance: number
}

export interface PublicTask {
  tareas_ID: string
  name: string
  fecha_inicio: string
  fecha_entrega: string
  estado: { name: string; color: string } | null
}

export interface PublicProjectDetail extends PublicProject {
  tareas: PublicTask[]
}

// ── Auditoría ────────────────────────────────────────────────
export type ResultadoAuditoria = 'exito' | 'fallo' | 'denegado'

export interface CambioAuditoria {
  campo: string
  etiqueta: string
  antes: unknown
  despues: unknown
}

export interface RegistroAuditoria {
  id: number
  creado_en: string
  usuario: string | null
  usuario_nombre: string
  usuario_email: string
  rol: string
  ip: string
  dispositivo: string
  sesion: string | null
  modulo: string
  modulo_display: string
  accion: string
  accion_display: string
  objeto_tipo: string
  objeto_id: string
  objeto_repr: string
  detalle: CambioAuditoria[]
  resultado: ResultadoAuditoria
  resultado_display: string
  motivo: string
  hash: string
}

export interface SesionUsuario {
  sesion_ID: string
  iniciada_en: string
  ultima_actividad: string
  segundos_activos: number
  ip: string
  dispositivo: string
  cerrada_en: string | null
  motivo_cierre: string
  motivo_cierre_display: string
  cerrada_por_nombre: string
  abierta: boolean
  actual: boolean
}

export interface ActividadUsuario {
  ultima_conexion: string | null
  segundos_30_dias: number
  sesiones_abiertas: number
  fallidos_24h: number
  puede_cerrar: boolean
  sesiones: SesionUsuario[]
  acciones: RegistroAuditoria[]
}

export interface PersonaAuditoria {
  user_ID: string
  nombre: string
  email: string
  ultima_conexion?: string | null
  intentos?: number
  ultimo?: string
}

export interface ResumenAuditoria {
  conectadas_ahora: number
  sesiones_abiertas: number
  registros_hoy: number
  denegados_24h: number
  fallidos_24h: number
  dias_inactiva: number
  umbral_fallidos: number
  inactivas: PersonaAuditoria[]
  total_inactivas: number
  con_intentos_fallidos: PersonaAuditoria[]
}

export interface VerificacionAuditoria {
  ok: boolean
  revisados: number
  registro: number | null
  fecha: string | null
  motivo: string
}

export interface OpcionAuditoria { codigo: string; nombre: string }
export interface CatalogoAuditoria {
  modulos: OpcionAuditoria[]
  acciones: OpcionAuditoria[]
  resultados: OpcionAuditoria[]
}
