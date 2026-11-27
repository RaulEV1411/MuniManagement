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

/** Lo que comparten direcciones y departamentos además del nombre y la jefatura (tanda D3). */
export interface DatosDeUnidad {
  codigo?: string | null
  descripcion?: string
  /** Toma la jefatura mientras el jefe tiene una ausencia vigente. */
  suplente?: string | null
  presupuesto_anual?: string | null
  correo?: string
  telefono?: string
  metas?: string[]
}

export interface Direction extends DatosDeUnidad {
  direccion_ID: string
  name: string
  jefe?: string | null
}

export interface Department extends DatosDeUnidad {
  departamentos_ID: string
  name: string
  direccion: Direction | string | null
  jefe?: string | null
}

export interface Especialidad {
  especialidad_ID: string
  name: string
}

export type TipoAusencia = 'vacaciones' | 'incapacidad' | 'permiso'

/** Si la persona está ausente hoy. El tipo solo llega a quien puede verlo (la incapacidad es dato de salud). */
export interface Disponibilidad {
  estado: 'disponible' | 'ausente'
  hasta: string | null
  tipo: TipoAusencia | null
}

export interface CargaDeTrabajo {
  tareas_abiertas: number
  tareas_vencidas: number
  horas_pendientes: number
  proyectos_a_cargo: number
}

export interface Ausencia {
  ausencia_ID: string
  usuario: string
  tipo: TipoAusencia | null
  desde: string
  hasta: string
  registrada_por: string | null
  registrada_por_nombre: string | null
  creada_en: string
  vigente: boolean
  /** Solo al crearla: los proyectos abiertos a cargo de la persona, para sugerir delegarlos. */
  proyectos_a_cargo?: { proyect_ID: string; name: string }[]
}

export interface User {
  user_ID: string
  first_name: string
  last_name: string
  email: string
  tipo_identificacion?: string
  cedula: string
  phone_number: string
  puesto: string
  birthday: string
  user_photo: string | null
  role: Role
  departamento_ID: Department
  is_active?: boolean
  // Solo para quien ve la ficha completa: la última actividad de sus sesiones.
  ultima_conexion?: string | null
  // Datos de empleado: número e ingreso solo en la ficha completa.
  numero_empleado?: string | null
  fecha_ingreso?: string | null
  extension?: string
  especialidades?: Especialidad[]
  disponibilidad?: Disponibilidad
  carga?: CargaDeTrabajo | null
}

export type CategoriaEstado = 'activo' | 'pausado' | 'finalizado'

export interface Estado {
  estado_ID: string
  name: string
  color?: string
  orden?: number
  is_system?: boolean
  // Activo, pausado o finalizado: a un estado finalizado se llega cerrando el proyecto.
  categoria?: CategoriaEstado
}

export interface Prioridad {
  prioridad_ID: string
  name: string
  color?: string
  orden?: number
  is_system?: boolean
}

export interface TareaPlantilla {
  plantilla_ID: string
  tipo: string
  nombre: string
  descripcion: string
  dias_desde_inicio: number
  duracion_dias: number
  pasos: string[]
  orden: number
}

export interface Tipo {
  tipos_ID: string
  name: string
  // Las tareas que se crean solas con un proyecto de este tipo.
  plantillas?: TareaPlantilla[]
}

export interface FuenteFinanciamiento {
  fuente_ID: string
  name: string
}

export interface Indicador {
  nombre: string
  unidad: string
  meta: number | null
  logrado: number | null
}

export interface Hito {
  hito_ID: string
  proyecto: string
  nombre: string
  descripcion: string
  fecha_prevista: string
  fecha_real: string | null
  cumplido: boolean
}

export interface Riesgo {
  riesgo_ID: string
  proyecto: string
  descripcion: string
  // 1 baja, 2 media, 3 alta.
  probabilidad: 1 | 2 | 3
  probabilidad_display: string
  impacto: 1 | 2 | 3
  impacto_display: string
  // Probabilidad por impacto: de 1 a 9.
  nivel: number
  mitigacion: string
  responsable: string | null
  responsable_info: User | null
  estado: 'abierto' | 'mitigado' | 'ocurrido' | 'cerrado'
  estado_display: string
  creado_en: string
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
  // Cerrado = estado finalizado o archivado: no se edita hasta reabrirlo.
  cerrado?: boolean
  archivado?: boolean
  archivado_en?: string | null
  // Solo en el detalle de un proyecto cerrado.
  cierre?: CierreProyecto | null
  // La suma de lo ejecutado en sus tareas.
  costo_ejecutado?: number
  // Ficha (todo opcional).
  codigo?: string | null
  numero_sicop?: string
  fuente_financiamiento?: string | null
  fuente_financiamiento_nombre?: string | null
  distrito?: string
  // Decimales en texto, como los manda Django.
  latitud?: string | null
  longitud?: string | null
  objetivo?: string
  beneficiarios?: number | null
  indicadores?: Indicador[]
}

export type TipoDocumento = 'acta' | 'plano' | 'factura' | 'contrato' | 'informe' | 'foto' | 'otro'
export interface DocumentoProyecto {
  documento_ID: string
  proyecto?: string
  tarea?: string | null
  tipo: TipoDocumento
  tipo_display?: string
  nombre: string
  url: string
  subido_por?: string | null
  subido_por_nombre?: string
  creado_en: string
}

export interface CierreProyecto {
  cierre_ID: string
  estado: string
  estado_nombre: string
  fecha_fin_real: string
  costo_real: number
  motivo: string
  lecciones: string
  cerrado_por_nombre: string
  cerrado_en: string
  documentos: DocumentoProyecto[]
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
  costo?: number
  costo_ejecutado?: number
  colaboradores?: Pick<User, 'user_ID' | 'first_name' | 'last_name' | 'user_photo'>[]
  bloqueada_por?: Array<{ tareas_ID: string; name: string; estado_ID: Estado }>
  bloqueada?: boolean
  avance?: number
  // Decimales: llegan como texto ("12.5").
  horas_estimadas?: string | null
  horas_reales?: string | null
  etiquetas?: string[]
  checklist?: ChecklistItem[]
  recursos?: AsignacionRecurso[]
  documentos?: number
  comentarios?: number
}

export interface ChecklistItem {
  item_ID: string
  tarea: string
  texto: string
  hecho: boolean
  orden: number
  hecho_por_nombre: string
  hecho_en: string | null
}

export interface ComentarioTarea {
  comentario_ID: string
  tarea: string
  autor: Pick<User, 'user_ID' | 'first_name' | 'last_name' | 'user_photo'> | null
  texto: string
  creado_en: string
}

export type TipoRecurso = 'vehiculo' | 'maquinaria' | 'equipo' | 'material' | 'otro'
export interface Recurso {
  recurso_ID: string
  nombre: string
  tipo: TipoRecurso
  tipo_display: string
  codigo: string
  descripcion: string
  activo: boolean
}

export interface AsignacionRecurso {
  asignacion_ID: string
  tarea: string
  recurso: string
  recurso_info: Recurso
  cantidad: string
  desde: string | null
  hasta: string | null
  nota: string
  cruces?: string[]
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

// ── Solicitudes ──────────────────────────────────────────────
export type EfectoSolicitud = 'plazo' | 'aumento' | 'rebajo' | 'personal' | 'responsable' | 'ninguno'
export type NivelAprobacion = 'departamento' | 'direccion' | 'alcaldia'

export interface TipoSolicitud {
  tipo_ID: number
  nombre: string
  descripcion: string
  efecto: EfectoSolicitud
  efecto_display: string
  dias_respuesta: number
  is_system: boolean
  activo: boolean
  orden: number
}

export interface ReglaAprobacion {
  regla_ID: number
  tipo: number
  nivel: NivelAprobacion
  nivel_display: string
  desde: number
}

export interface PasoAprobacion {
  orden: number
  nivel: NivelAprobacion
  nivel_display: string
  estado: 'pendiente' | 'aprobado' | 'rechazado' | 'omitido'
  estado_display: string
  vence: string | null
  escalado: boolean
  decidido_por_nombre: string
  decidido_en: string | null
  comentario: string
}

export interface Solicitud {
  numero: number
  proyecto: string
  proyecto_nombre: string
  tarea: string | null
  tarea_nombre: string
  tipo: number
  tipo_nombre: string
  efecto: EfectoSolicitud
  justificacion: string
  nueva_fecha: string | null
  fecha_actual: string | null
  monto: number | null
  persona: string | null
  persona_nombre: string
  rol_proyecto: string | null
  rol_proyecto_nombre: string
  hasta: string | null
  impacto: number
  estado: 'enviada' | 'en_revision' | 'aprobada' | 'rechazada' | 'retirada'
  estado_display: string
  solicitante: string | null
  solicitante_nombre: string
  creada_en: string
  resuelta_en: string | null
  aplicada: boolean
  resultado: string
  pasos: PasoAprobacion[]
  vence: string | null
  puedo_decidir: boolean
  puedo_retirar: boolean
}
