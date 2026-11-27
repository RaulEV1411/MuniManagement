import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'
import type {
  ActividadUsuario, AjustePresupuesto, CatalogoAuditoria, CatalogoPermisos, Feedback, MiembroProyecto, RegistroAuditoria, ResumenAuditoria,
  Role, RolProyecto, HistorialEntry, Notificacion, Project, PublicProject, Task, User, VerificacionAuditoria,
  ReglaAprobacion, Solicitud, TipoSolicitud, ChecklistItem, ComentarioTarea, Recurso, AsignacionRecurso, DocumentoProyecto,
  FuenteFinanciamiento, Hito, Riesgo, TareaPlantilla,
} from '@/types'
import type { Marca } from './marca'

// Mismo dominio que el front: Caddy en producción y el proxy de Vite en desarrollo mandan /api a Django.
const BASE_URL = import.meta.env.VITE_API_URL ?? '/api/v1'

// La sesión viaja en cookies HttpOnly que fija el servidor: el front nunca ve los JWT.
// Lo que sí guarda (en memoria) es el token CSRF, que acompaña a cada petición que modifica datos.
export const api = axios.create({ baseURL: BASE_URL, timeout: 15_000, withCredentials: true })

let csrfToken: string | null = null
export const setCsrfToken = (token: string | null) => { csrfToken = token }

const METODOS_SEGUROS = new Set(['get', 'head', 'options'])

// Los ids van dentro de la URL: solo se aceptan UUID, y codificados, para que un valor
// manipulado (por ejemplo con ../) no termine llamando a otro endpoint con la sesión del usuario.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export function seg(valor: string): string {
  if (!UUID.test(valor)) throw new Error(`Identificador inválido: ${valor}`)
  return encodeURIComponent(valor)
}

let renovando: Promise<void> | null = null
let redirigiendo = false
const renovarSesion = () => {
  renovando ??= axios
    .post(`${BASE_URL}/users/token/refresh/`, null, { withCredentials: true })
    .then(() => undefined)
    .finally(() => { renovando = null })
  return renovando
}

api.interceptors.request.use(config => {
  if (csrfToken && !METODOS_SEGUROS.has((config.method ?? 'get').toLowerCase())) {
    config.headers['X-CSRFToken'] = csrfToken
  }
  return config
})

api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined
    if (err.response?.status !== 401 || !original || original._retry) return Promise.reject(err)
    original._retry = true
    try {
      await renovarSesion()
      return api(original)
    } catch (refreshErr) {
      // El aviso «su sesión terminó» solo si había una abierta (el token CSRF llega con la sesión);
      // no al entrar sin sesión ni después de cerrarla uno mismo. Si fallan varias peticiones a la
      // vez, decide la primera.
      if (!redirigiendo && window.location.pathname !== '/login') {
        redirigiendo = true
        window.location.href = csrfToken !== null ? '/login?sesion=terminada' : '/login'
      }
      setCsrfToken(null)
      return Promise.reject(refreshErr)
    }
  },
)

// ── Listas paginadas ──────────────────────────────────────────
// El servidor pagina (50 por defecto, hasta 100). Las pantallas con lista larga piden una página y
// muestran el total; las que necesitan todo (selectores, exportar) recorren todas las páginas.
export interface Pagina<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}
export type Filtros = Record<string, string | number | undefined>

async function todasDe<T>(cliente: AxiosInstance, url: string, params: Filtros = {}): Promise<T[]> {
  const filas: T[] = []
  for (let page = 1; ; page++) {
    const { data } = await cliente.get<Pagina<T> | T[]>(url, { params: { ...params, page, page_size: 100 } })
    if (Array.isArray(data)) return data
    filas.push(...data.results)
    if (!data.next) return filas
  }
}

const paginaDe = <T>(url: string, params: Filtros) => api.get<Pagina<T>>(url, { params }).then(r => r.data)

// ── Auth ──────────────────────────────────────────────────────
export const login = (email: string, password: string) =>
  api.post('/users/login/', { email, password }).then(r => r.data)

export const changePassword = (current_password: string, new_password: string) =>
  api.post('/users/change-password/', { current_password, new_password }).then(r => r.data)

export const definirClave = (uid: string, token: string, password: string) =>
  axios.post(`${BASE_URL}/users/definir-clave/`, { uid, token, password }).then(r => r.data)

export const olvideClave = (email: string) =>
  axios.post(`${BASE_URL}/users/olvide-clave/`, { email }).then(r => r.data)

// ── Users ─────────────────────────────────────────────────────
export const getUsers        = ()           => todasDe<User>(api, '/users/users/')
export const getUsuariosPagina = (params: Filtros) => paginaDe<User>('/users/users/', params)
export const getUserById     = (id: string) => api.get(`/users/users/${seg(id)}/`).then(r => r.data)
export const createUser      = (data: FormData | object) => api.post('/users/users/', data).then(r => r.data)
export const updateUser      = (id: string, data: object) => api.patch(`/users/users/${seg(id)}/`, data).then(r => r.data)
export const deleteUser      = (id: string) => api.delete(`/users/users/${seg(id)}/`).then(r => r.data)
export const enviarAcceso    = (id: string) => api.post(`/users/users/${seg(id)}/enviar-acceso/`).then(r => r.data)
export const uploadUserPhoto = (id: string, file: File) => {
  const fd = new FormData(); fd.append('image', file)
  return api.post(`/users/upload-photo/${seg(id)}/`, fd).then(r => r.data)
}
export const getRoles        = ()           => api.get('/users/roles/').then(r => r.data)
export const createRole      = (data: object) => api.post('/users/roles/', data).then(r => r.data)

// ── Projects ──────────────────────────────────────────────────
export const getProjects     = (params: Filtros = {}) => todasDe<Project>(api, '/projects/proyectosRead/', params)
export const getProyectosPagina = (params: Filtros) => paginaDe<Project>('/projects/proyectosRead/', params)
export const getResumenProyectos = (params: Filtros = {}) => api.get<ResumenProyectos>('/projects/proyectosRead/resumen/', { params }).then(r => r.data)
export const getProjectById  = (id: string) => api.get(`/projects/proyectosRead/${seg(id)}/`).then(r => r.data)
export const getProjectsByUser = (userId: string) => todasDe<Project>(api, '/projects/proyectosRead/', { user_ID: userId })
export const createProject   = (data: object) => api.post('/projects/proyectosWrite/', data).then(r => r.data)
export const updateProject   = (id: string, data: object) => api.put(`/projects/proyectosWrite/${seg(id)}/`, data).then(r => r.data)
export const patchProject    = (id: string, data: object) => api.patch(`/projects/proyectosWrite/${seg(id)}/`, data).then(r => r.data)
// Los proyectos no se borran: se cierran (con el acta, si la hay), se reabren y se archivan.
export const cerrarProyecto = (id: string, datos: FormData) =>
  api.post(`/projects/proyectosWrite/${seg(id)}/cerrar/`, datos).then(r => r.data)
export const reabrirProyecto = (id: string, datos: { estado_ID: string; motivo: string }) =>
  api.post(`/projects/proyectosWrite/${seg(id)}/reabrir/`, datos).then(r => r.data)
export const archivarProyecto = (id: string) => api.post(`/projects/proyectosWrite/${seg(id)}/archivar/`).then(r => r.data)
export const desarchivarProyecto = (id: string) => api.post(`/projects/proyectosWrite/${seg(id)}/desarchivar/`).then(r => r.data)
export const uploadProjectImage = (projectId: string, file: File) => {
  const fd = new FormData(); fd.append('image', file); fd.append('proyecto_ID', projectId)
  return api.post('/projects/project-images/', fd).then(r => r.data)
}
export const deleteProjectImage = (imageId: string) => api.delete(`/projects/project-images/${seg(imageId)}/`).then(r => r.data)

// ── Tasks ─────────────────────────────────────────────────────
export const getTasksByProject = (projectId: string) => todasDe<Task>(api, '/task/tareas/', { proyecto_ID: projectId })
export const createTask   = (data: object) => api.post('/task/tareas/', data).then(r => r.data)
export const updateTask   = (id: string, data: object) => api.put(`/task/tareas/${seg(id)}/`, data).then(r => r.data)
export const patchTask    = (id: string, data: object) => api.patch(`/task/tareas/${seg(id)}/`, data).then(r => r.data)
export const deleteTask   = (id: string) => api.delete(`/task/tareas/${seg(id)}/`).then(r => r.data)
export const uploadTaskImage = (taskId: string, file: File) => {
  const fd = new FormData(); fd.append('image', file); fd.append('tarea_ID', taskId)
  return api.post('/task/task-images/', fd).then(r => r.data)
}
export const deleteTaskImage = (imageId: string) => api.delete(`/task/task-images/${seg(imageId)}/`).then(r => r.data)

// ── Feedback ──────────────────────────────────────────────────
export const getFeedback   = (projectId: string) => todasDe<Feedback>(api, '/feedback/feedback/', { proyecto_ID: projectId })
export const createFeedback = (data: object) => api.post('/feedback/feedback/', data).then(r => r.data)
export const deleteFeedback = (id: string) => api.delete(`/feedback/feedback/${seg(id)}/`).then(r => r.data)

// ── Historial ─────────────────────────────────────────────────
export const getHistorial = (proyectoId: string) => todasDe<HistorialEntry>(api, '/historial/cambios/', { proyecto_ID: proyectoId })

// ── Departments ───────────────────────────────────────────────
export const getDepartments   = ()             => api.get('/departments/departamentos/').then(r => r.data)
export const createDepartment = (data: object) => api.post('/departments/departamentos/', data).then(r => r.data)
export const updateDepartment = (id: string, data: object) => api.put(`/departments/departamentos/${seg(id)}/`, data).then(r => r.data)
export const deleteDepartment = (id: string)   => api.delete(`/departments/departamentos/${seg(id)}/`).then(r => r.data)
export const getDirections    = ()             => api.get('/departments/direcciones/').then(r => r.data)
export const createDirection  = (data: object) => api.post('/departments/direcciones/', data).then(r => r.data)
export const updateDirection  = (id: string, data: object) => api.put(`/departments/direcciones/${seg(id)}/`, data).then(r => r.data)
export const deleteDirection  = (id: string)   => api.delete(`/departments/direcciones/${seg(id)}/`).then(r => r.data)

// ── Equipo del proyecto ───────────────────────────────────────
export const getMiembros = (projectId: string) =>
  todasDe<MiembroProyecto>(api, '/projects/miembros/', { proyecto_ID: projectId })
export const createMiembro = (data: object) => api.post<MiembroProyecto>('/projects/miembros/', data).then(r => r.data)
export const updateMiembro = (id: string, data: object) => api.patch<MiembroProyecto>(`/projects/miembros/${seg(id)}/`, data).then(r => r.data)
export const deleteMiembro = (id: string) => api.delete(`/projects/miembros/${seg(id)}/`).then(r => r.data)

// ── Roles y permisos ──────────────────────────────────────────
export const getCatalogoPermisos = () => api.get<CatalogoPermisos>('/users/roles/catalogo/').then(r => r.data)
export const getRolesConPermisos = () => api.get<Role[]>('/users/roles/').then(r => r.data)
export const createRol = (data: Partial<Role>) => api.post<Role>('/users/roles/', data).then(r => r.data)
export const updateRol = (id: string, data: Partial<Role>) => api.patch<Role>(`/users/roles/${seg(id)}/`, data).then(r => r.data)
export const deleteRol = (id: string) => api.delete(`/users/roles/${seg(id)}/`).then(r => r.data)
export const getRolesProyecto = () => api.get<RolProyecto[]>('/projects/roles-proyecto/').then(r => r.data)
export const createRolProyecto = (data: Partial<RolProyecto>) => api.post<RolProyecto>('/projects/roles-proyecto/', data).then(r => r.data)
export const updateRolProyecto = (id: string, data: Partial<RolProyecto>) => api.patch<RolProyecto>(`/projects/roles-proyecto/${seg(id)}/`, data).then(r => r.data)
export const deleteRolProyecto = (id: string) => api.delete(`/projects/roles-proyecto/${seg(id)}/`).then(r => r.data)
export interface PermisosDeUsuario {
  rol: string
  permisos: Record<string, string>
  equipos: Array<{ proyecto: string; nombre: string; rol: string; hasta: string | null }>
}
export const getPermisosDeUsuario = (id: string) => api.get<PermisosDeUsuario>(`/users/users/${seg(id)}/permisos/`).then(r => r.data)

// ── Ajustes de presupuesto ────────────────────────────────────
export const getAjustes = (params: { proyecto_ID?: string; tarea_ID?: string }) =>
  todasDe<AjustePresupuesto>(api, '/projects/ajustes-presupuesto/', params)
export const createAjuste = (data: object) =>
  api.post('/projects/ajustes-presupuesto/', data).then(r => r.data)
export const deleteAjuste = (id: string) =>
  api.delete(`/projects/ajustes-presupuesto/${seg(id)}/`).then(r => r.data)

// ── Notificaciones ────────────────────────────────────────────
export const getNotificaciones = (soloNoLeidas = false) =>
  api
    .get('/notifications/notificaciones/', {
      params: { page_size: 30, ...(soloNoLeidas ? { no_leidas: 1 } : {}) },
    })
    .then(r => (r.data as Pagina<Notificacion>).results)
export const marcarLeida = (id: string) =>
  api.patch(`/notifications/notificaciones/${seg(id)}/`, { leida: true }).then(r => r.data)
export const marcarTodasLeidas = () =>
  api.post('/notifications/notificaciones/marcar_todas_leidas/').then(r => r.data)
export const getResumenLogin = () =>
  api.get('/notifications/notificaciones/resumen/', { timeout: 4_000 }).then(r => r.data)

export const completarOnboarding = () =>
  api.post('/users/completar-onboarding/').then(r => r.data)
export const logout = () =>
  api.post('/users/logout/').then(r => r.data)
export const aceptarPrivacidad = (version: number) => api.post('/users/aceptar-privacidad/', { version }).then(r => r.data)
export const getMisDatos = (userId: string) => api.get(`/users/users/${seg(userId)}/datos/`).then(r => r.data as Record<string, unknown>)
export const anonimizarUsuario = (userId: string, motivo: string) => api.post(`/users/users/${seg(userId)}/anonimizar/`, { motivo }).then(r => r.data)
export const urlExportarUsuarios = () => `${BASE_URL}/users/users/exportar/`
export const getMe = () => api.get('/users/me/').then(r => r.data)

// ── Vista pública ─────────────────────────────────────────────
const publicApi = axios.create({ baseURL: BASE_URL, timeout: 10_000 })
export const getPublicProjects = (search = '') =>
  todasDe<PublicProject>(publicApi, '/public/projects/', search ? { search } : {})
export const getPublicProject = (id: string) =>
  publicApi.get(`/public/projects/${seg(id)}/`).then(r => r.data)

// ── Config ────────────────────────────────────────────────────
export const getEstados      = ()             => api.get('/projects/estados/').then(r => r.data)
export const createEstado    = (data: object) => api.post('/projects/estados/', data).then(r => r.data)
export const updateEstado    = (id: string, d: object) => api.put(`/projects/estados/${seg(id)}/`, d).then(r => r.data)
export const deleteEstado    = (id: string)   => api.delete(`/projects/estados/${seg(id)}/`).then(r => r.data)
export const getPrioridades  = ()             => api.get('/projects/prioridades/').then(r => r.data)
export const createPrioridad = (data: object) => api.post('/projects/prioridades/', data).then(r => r.data)
export const updatePrioridad = (id: string, d: object) => api.put(`/projects/prioridades/${seg(id)}/`, d).then(r => r.data)
export const deletePrioridad = (id: string)   => api.delete(`/projects/prioridades/${seg(id)}/`).then(r => r.data)
export const getTipos        = ()             => api.get('/projects/tipos/').then(r => r.data)
export const createTipo      = (data: object) => api.post('/projects/tipos/', data).then(r => r.data)
export const updateTipo      = (id: string, d: object) => api.put(`/projects/tipos/${seg(id)}/`, d).then(r => r.data)
export const deleteTipo      = (id: string)   => api.delete(`/projects/tipos/${seg(id)}/`).then(r => r.data)
export const crearPlantilla = (datos: Partial<TareaPlantilla>) => api.post<TareaPlantilla>('/projects/plantillas/', datos).then(r => r.data)
export const actualizarPlantilla = (id: string, datos: Partial<TareaPlantilla>) => api.patch<TareaPlantilla>(`/projects/plantillas/${seg(id)}/`, datos).then(r => r.data)
export const borrarPlantilla = (id: string) => api.delete(`/projects/plantillas/${seg(id)}/`).then(r => r.data)
export const getFuentes = () => api.get<FuenteFinanciamiento[]>('/projects/fuentes/').then(r => r.data)
export const createFuente = (data: object) => api.post('/projects/fuentes/', data).then(r => r.data)
export const updateFuente = (id: string, d: object) => api.put(`/projects/fuentes/${seg(id)}/`, d).then(r => r.data)
export const deleteFuente = (id: string) => api.delete(`/projects/fuentes/${seg(id)}/`).then(r => r.data)
export const getHitos = (proyecto: string) => api.get<Hito[]>('/projects/hitos/', { params: { proyecto } }).then(r => r.data)
export const crearHito = (datos: Partial<Hito>) => api.post<Hito>('/projects/hitos/', datos).then(r => r.data)
export const actualizarHito = (id: string, datos: Partial<Hito>) => api.patch<Hito>(`/projects/hitos/${seg(id)}/`, datos).then(r => r.data)
export const borrarHito = (id: string) => api.delete(`/projects/hitos/${seg(id)}/`).then(r => r.data)
export const getRiesgos = (proyecto: string) => api.get<Riesgo[]>('/projects/riesgos/', { params: { proyecto } }).then(r => r.data)
export const crearRiesgo = (datos: Partial<Riesgo>) => api.post<Riesgo>('/projects/riesgos/', datos).then(r => r.data)
export const actualizarRiesgo = (id: string, datos: Partial<Riesgo>) => api.patch<Riesgo>(`/projects/riesgos/${seg(id)}/`, datos).then(r => r.data)
export const borrarRiesgo = (id: string) => api.delete(`/projects/riesgos/${seg(id)}/`).then(r => r.data)

export interface ResumenProyectos {
  total: number
  completados: number
  en_progreso: number
  vencidos: number
  porcentaje_completado: number
  costo_total: number
  por_estado: Array<{ estado_ID: string; name: string; color: string; total: number }>
  por_departamento: Array<{ departamento_ID: string; name: string; total: number; completados: number }>
  // Contadores de las pestañas, con los mismos filtros salvo la pestaña.
  por_categoria: Record<'activo' | 'pausado' | 'finalizado', number>
  archivados: number
}

// ── Institución ───────────────────────────────────────────────
// ── Auditoría ────────────────────────────────────────────────
export const getRegistrosAuditoria = (params: Filtros) =>
  api.get<Pagina<RegistroAuditoria>>('/auditoria/registros/', { params }).then(r => r.data)
export const getCatalogoAuditoria = () => api.get<CatalogoAuditoria>('/auditoria/catalogo/').then(r => r.data)
export const getResumenAuditoria = () => api.get<ResumenAuditoria>('/auditoria/resumen/').then(r => r.data)
export const verificarAuditoria = () => api.get<VerificacionAuditoria>('/auditoria/verificar/').then(r => r.data)
export const getActividad = (userId: string) =>
  api.get<ActividadUsuario>(`/auditoria/actividad/${seg(userId)}/`).then(r => r.data)
export const cerrarSesionRemota = (sesionId: string) =>
  api.post(`/auditoria/sesiones/${seg(sesionId)}/cerrar/`).then(r => r.data)
/** Los reportes se arman en el navegador: se avisa al servidor para que quede en la auditoría. */
export const registrarExportacion = (datos: { formato: 'xlsx' | 'pdf'; cantidad: number; filtros: Record<string, string> }) =>
  api.post('/auditoria/exportaciones/', datos).then(r => r.data)
/** URL de descarga con los filtros: el navegador la baja con las cookies de la sesión. */
export function urlExportarAuditoria(formato: 'csv' | 'json', filtros: Filtros): string {
  const params = new URLSearchParams({ formato })
  for (const [k, v] of Object.entries(filtros)) if (v !== undefined && v !== '' && k !== 'page') params.set(k, String(v))
  return `${BASE_URL}/auditoria/registros/exportar/?${params}`
}

// ── Tareas: lista de verificación, comentarios, recursos y documentos ─────
export const crearItemChecklist = (tarea: string, texto: string) => api.post<ChecklistItem>('/task/checklist/', { tarea, texto }).then(r => r.data)
export const actualizarItemChecklist = (id: string, datos: Partial<ChecklistItem>) => api.patch<ChecklistItem>(`/task/checklist/${seg(id)}/`, datos).then(r => r.data)
export const borrarItemChecklist = (id: string) => api.delete(`/task/checklist/${seg(id)}/`).then(r => r.data)
export const getComentariosTarea = (tarea: string) => api.get<ComentarioTarea[]>('/task/comentarios/', { params: { tarea } }).then(r => r.data)
export const crearComentarioTarea = (tarea: string, texto: string) => api.post<ComentarioTarea>('/task/comentarios/', { tarea, texto }).then(r => r.data)
export const borrarComentarioTarea = (id: string) => api.delete(`/task/comentarios/${seg(id)}/`).then(r => r.data)
export const getRecursos = () => api.get<Recurso[]>('/task/recursos/').then(r => r.data)
export const crearRecurso = (datos: Partial<Recurso>) => api.post<Recurso>('/task/recursos/', datos).then(r => r.data)
export const actualizarRecurso = (id: string, datos: Partial<Recurso>) => api.patch<Recurso>(`/task/recursos/${seg(id)}/`, datos).then(r => r.data)
export const borrarRecurso = (id: string) => api.delete(`/task/recursos/${seg(id)}/`).then(r => r.data)
export const asignarRecurso = (datos: { tarea: string; recurso: string; cantidad: string; desde?: string | null; hasta?: string | null; nota?: string }) =>
  api.post<AsignacionRecurso>('/task/asignaciones/', datos).then(r => r.data)
export const quitarRecurso = (id: string) => api.delete(`/task/asignaciones/${seg(id)}/`).then(r => r.data)
export const getDocumentos = (params: { proyecto?: string; tarea?: string; solo_proyecto?: string }) =>
  api.get<DocumentoProyecto[]>('/projects/documentos/', { params }).then(r => r.data)
export const subirDocumento = (datos: { proyecto?: string; tarea?: string; tipo: string; archivo: File }) => {
  const fd = new FormData()
  if (datos.proyecto) fd.append('proyecto', datos.proyecto)
  if (datos.tarea) fd.append('tarea', datos.tarea)
  fd.append('tipo', datos.tipo)
  fd.append('archivo', datos.archivo)
  return api.post<DocumentoProyecto>('/projects/documentos/', fd).then(r => r.data)
}
export const borrarDocumento = (id: string) => api.delete(`/projects/documentos/${seg(id)}/`).then(r => r.data)

// ── Solicitudes ──────────────────────────────────────────────
export const getSolicitudes = (params: Filtros) =>
  api.get<Pagina<Solicitud>>('/solicitudes/solicitudes/', { params }).then(r => r.data)
export const getSolicitud = (numero: number) => api.get<Solicitud>(`/solicitudes/solicitudes/${Number(numero)}/`).then(r => r.data)
export const crearSolicitud = (datos: Record<string, string | number | null>) =>
  api.post<Solicitud>('/solicitudes/solicitudes/', datos).then(r => r.data)
export const decidirSolicitud = (numero: number, aprobar: boolean, comentario: string) =>
  api.post<Solicitud>(`/solicitudes/solicitudes/${Number(numero)}/decidir/`, { aprobar, comentario }).then(r => r.data)
export const retirarSolicitud = (numero: number) =>
  api.post<Solicitud>(`/solicitudes/solicitudes/${Number(numero)}/retirar/`).then(r => r.data)
export const getConteoSolicitudes = () => api.get<{ por_aprobar: number }>('/solicitudes/solicitudes/conteo/').then(r => r.data)
export const getTiposSolicitud = () => api.get<TipoSolicitud[]>('/solicitudes/tipos/').then(r => r.data)
export const updateTipoSolicitud = (id: number, datos: Partial<TipoSolicitud>) =>
  api.patch<TipoSolicitud>(`/solicitudes/tipos/${Number(id)}/`, datos).then(r => r.data)
export const createTipoSolicitud = (datos: Partial<TipoSolicitud>) =>
  api.post<TipoSolicitud>('/solicitudes/tipos/', datos).then(r => r.data)
export const getReglasAprobacion = () => api.get<ReglaAprobacion[]>('/solicitudes/reglas/').then(r => r.data)
export const createReglaAprobacion = (datos: Omit<ReglaAprobacion, 'regla_ID' | 'nivel_display'>) =>
  api.post<ReglaAprobacion>('/solicitudes/reglas/', datos).then(r => r.data)
export const updateReglaAprobacion = (id: number, datos: Partial<ReglaAprobacion>) =>
  api.patch<ReglaAprobacion>(`/solicitudes/reglas/${Number(id)}/`, datos).then(r => r.data)
export const deleteReglaAprobacion = (id: number) => api.delete(`/solicitudes/reglas/${Number(id)}/`).then(r => r.data)

export const getConfiguracion = () => api.get<Marca>('/configuracion/').then(r => r.data)
export const updateConfiguracion = (datos: Partial<Marca>) => api.patch<Marca>('/configuracion/', datos).then(r => r.data)
export const subirLogo = (archivo: File) => {
  const fd = new FormData(); fd.append('image', archivo)
  return api.post<Marca>('/configuracion/logo/', fd).then(r => r.data)
}
export const borrarLogo = () => api.delete<Marca>('/configuracion/logo/').then(r => r.data)
