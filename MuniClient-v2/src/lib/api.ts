import axios, { type InternalAxiosRequestConfig } from 'axios'

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
function seg(valor: string): string {
  if (!UUID.test(valor)) throw new Error(`Identificador inválido: ${valor}`)
  return encodeURIComponent(valor)
}

let renovando: Promise<void> | null = null
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
  res => {
    const d = res.data
    if (d && typeof d === 'object' && Array.isArray(d.results) && 'count' in d && 'next' in d) {
      res.data = d.results
    }
    return res
  },
  async err => {
    const original = err.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined
    if (err.response?.status !== 401 || !original || original._retry) return Promise.reject(err)
    original._retry = true
    try {
      await renovarSesion()
      return api(original)
    } catch (refreshErr) {
      setCsrfToken(null)
      if (window.location.pathname !== '/login') window.location.href = '/login'
      return Promise.reject(refreshErr)
    }
  },
)

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
export const getUsers        = ()           => api.get('/users/users/').then(r => r.data)
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
export const getProjects     = ()           => api.get('/projects/proyectosRead/').then(r => r.data)
export const getProjectById  = (id: string) => api.get(`/projects/proyectosRead/${seg(id)}/`).then(r => r.data)
export const getProjectsByUser = (userId: string) => api.get('/projects/proyectosRead/', { params: { user_ID: userId } }).then(r => r.data)
export const createProject   = (data: object) => api.post('/projects/proyectosWrite/', data).then(r => r.data)
export const updateProject   = (id: string, data: object) => api.put(`/projects/proyectosWrite/${seg(id)}/`, data).then(r => r.data)
export const patchProject    = (id: string, data: object) => api.patch(`/projects/proyectosWrite/${seg(id)}/`, data).then(r => r.data)
export const deleteProject   = (id: string) => api.delete(`/projects/proyectosWrite/${seg(id)}/`).then(r => r.data)
export const uploadProjectImage = (projectId: string, file: File) => {
  const fd = new FormData(); fd.append('image', file); fd.append('proyecto_ID', projectId)
  return api.post('/projects/project-images/', fd).then(r => r.data)
}
export const deleteProjectImage = (imageId: string) => api.delete(`/projects/project-images/${seg(imageId)}/`).then(r => r.data)

// ── Tasks ─────────────────────────────────────────────────────
export const getTasksByProject = (projectId: string) => api.get('/task/tareas/', { params: { proyecto_ID: projectId } }).then(r => r.data)
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
export const getFeedback   = (projectId: string) => api.get('/feedback/feedback/', { params: { proyecto_ID: projectId } }).then(r => r.data)
export const createFeedback = (data: object) => api.post('/feedback/feedback/', data).then(r => r.data)
export const deleteFeedback = (id: string) => api.delete(`/feedback/feedback/${seg(id)}/`).then(r => r.data)

// ── Historial ─────────────────────────────────────────────────
export const getHistorial = (proyectoId: string) => api.get('/historial/cambios/', { params: { proyecto_ID: proyectoId } }).then(r => r.data)

// ── Departments ───────────────────────────────────────────────
export const getDepartments   = ()             => api.get('/departments/departamentos/').then(r => r.data)
export const createDepartment = (data: object) => api.post('/departments/departamentos/', data).then(r => r.data)
export const updateDepartment = (id: string, data: object) => api.put(`/departments/departamentos/${seg(id)}/`, data).then(r => r.data)
export const deleteDepartment = (id: string)   => api.delete(`/departments/departamentos/${seg(id)}/`).then(r => r.data)
export const getDirections    = ()             => api.get('/departments/direcciones/').then(r => r.data)
export const createDirection  = (data: object) => api.post('/departments/direcciones/', data).then(r => r.data)
export const updateDirection  = (id: string, data: object) => api.put(`/departments/direcciones/${seg(id)}/`, data).then(r => r.data)
export const deleteDirection  = (id: string)   => api.delete(`/departments/direcciones/${seg(id)}/`).then(r => r.data)

// ── Delegaciones ──────────────────────────────────────────────
export const getDelegaciones = (projectId: string) =>
  api.get('/projects/delegaciones/', { params: { proyecto_ID: projectId } }).then(r => r.data)
export const createDelegacion = (data: object) =>
  api.post('/projects/delegaciones/', data).then(r => r.data)
export const deleteDelegacion = (id: string) =>
  api.delete(`/projects/delegaciones/${seg(id)}/`).then(r => r.data)

// ── Ajustes de presupuesto ────────────────────────────────────
export const getAjustes = (params: { proyecto_ID?: string; tarea_ID?: string }) =>
  api.get('/projects/ajustes-presupuesto/', { params }).then(r => r.data)
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
    .then(r => r.data)
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
export const getMe = () => api.get('/users/me/').then(r => r.data)

// ── Vista pública ─────────────────────────────────────────────
const publicApi = axios.create({ baseURL: BASE_URL, timeout: 10_000 })
publicApi.interceptors.response.use(res => {
  const d = res.data
  if (d && typeof d === 'object' && Array.isArray(d.results) && 'count' in d && 'next' in d) {
    res.data = d.results
  }
  return res
})
export const getPublicProjects = (search = '') =>
  publicApi.get('/public/projects/', { params: search ? { search } : {} }).then(r => r.data)
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
