export interface Role {
  role_ID: string
  name: string
}

export interface Direction {
  direccion_ID: string
  name: string
}

export interface Department {
  departamentos_ID: string
  name: string
  direccion: Direction | string | null
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
}

export interface Estado {
  estado_ID: string
  name: string
}

export interface Prioridad {
  prioridad_ID: string
  name: string
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
