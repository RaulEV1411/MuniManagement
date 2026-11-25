import axios from 'axios'
import { getCookie, setCookie, deleteCookie } from './utils'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export const api = axios.create({ baseURL: BASE_URL, timeout: 15_000 })

let isRefreshing = false
let queue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = []

function processQueue(error: unknown, token: string | null) {
  queue.forEach(p => error ? p.reject(error) : p.resolve(token!))
  queue = []
}

api.interceptors.request.use(config => {
  const token = getCookie('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
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
    const original = err.config
    if (err.response?.status !== 401 || original._retry) return Promise.reject(err)

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        queue.push({
          resolve: token => { original.headers.Authorization = `Bearer ${token}`; resolve(api(original)) },
          reject,
        })
      })
    }

    original._retry = true
    isRefreshing = true

    try {
      const refresh = getCookie('refreshToken')
      if (!refresh) throw new Error('No refresh token')
      const { data } = await axios.post(`${BASE_URL}/users/token/refresh/`, { refresh })
      setCookie('accessToken', data.access, 0.02)
      api.defaults.headers.common.Authorization = `Bearer ${data.access}`
      processQueue(null, data.access)
      original.headers.Authorization = `Bearer ${data.access}`
      return api(original)
    } catch (refreshErr) {
      processQueue(refreshErr, null)
      deleteCookie('accessToken')
      deleteCookie('refreshToken')
      window.location.href = '/login'
      return Promise.reject(refreshErr)
    } finally {
      isRefreshing = false
    }
  },
)

// ── Auth ──────────────────────────────────────────────────────
export const login = (email: string, password: string) =>
  api.post('/users/login/', { email, password }).then(r => r.data)

export const changePassword = (current_password: string, new_password: string) =>
  api.post('/users/change-password/', { current_password, new_password }).then(r => r.data)

// ── Users ─────────────────────────────────────────────────────
export const getUsers        = ()           => api.get('/users/users/').then(r => r.data)
export const getUserById     = (id: string) => api.get(`/users/users/${id}/`).then(r => r.data)
export const createUser      = (data: FormData | object) => api.post('/users/users/', data).then(r => r.data)
export const updateUser      = (id: string, data: object) => api.put(`/users/users/${id}/`, data).then(r => r.data)
export const deleteUser      = (id: string) => api.delete(`/users/users/${id}/`).then(r => r.data)
export const uploadUserPhoto = (id: string, file: File) => {
  const fd = new FormData(); fd.append('photo', file)
  return api.post(`/users/upload-photo/${id}/`, fd).then(r => r.data)
}
export const getRoles        = ()           => api.get('/users/roles/').then(r => r.data)
export const createRole      = (data: object) => api.post('/users/roles/', data).then(r => r.data)

// ── Projects ──────────────────────────────────────────────────
export const getProjects     = ()           => api.get('/projects/proyectosRead/').then(r => r.data)
export const getProjectById  = (id: string) => api.get(`/projects/proyectosRead/${id}/`).then(r => r.data)
export const getProjectsByUser = (userId: string) => api.get('/projects/proyectosRead/', { params: { user_ID: userId } }).then(r => r.data)
export const createProject   = (data: object) => api.post('/projects/proyectosWrite/', data).then(r => r.data)
export const updateProject   = (id: string, data: object) => api.put(`/projects/proyectosWrite/${id}/`, data).then(r => r.data)
export const patchProject    = (id: string, data: object) => api.patch(`/projects/proyectosWrite/${id}/`, data).then(r => r.data)
export const deleteProject   = (id: string) => api.delete(`/projects/proyectosWrite/${id}/`).then(r => r.data)
export const uploadProjectImage = (projectId: string, file: File) => {
  const fd = new FormData(); fd.append('image', file); fd.append('proyecto_ID', projectId)
  return api.post('/projects/project-images/', fd).then(r => r.data)
}
export const deleteProjectImage = (imageId: string) => api.delete(`/projects/project-images/${imageId}/`).then(r => r.data)

// ── Tasks ─────────────────────────────────────────────────────
export const getTasksByProject = (projectId: string) => api.get('/task/tareas/', { params: { proyecto_ID: projectId } }).then(r => r.data)
export const createTask   = (data: object) => api.post('/task/tareas/', data).then(r => r.data)
export const updateTask   = (id: string, data: object) => api.put(`/task/tareas/${id}/`, data).then(r => r.data)
export const patchTask    = (id: string, data: object) => api.patch(`/task/tareas/${id}/`, data).then(r => r.data)
export const deleteTask   = (id: string) => api.delete(`/task/tareas/${id}/`).then(r => r.data)
export const uploadTaskImage = (taskId: string, file: File) => {
  const fd = new FormData(); fd.append('image', file); fd.append('tarea_ID', taskId)
  return api.post('/task/task-images/', fd).then(r => r.data)
}
export const deleteTaskImage = (imageId: string) => api.delete(`/task/task-images/${imageId}/`).then(r => r.data)

// ── Feedback ──────────────────────────────────────────────────
export const getFeedback   = (projectId: string) => api.get('/feedback/feedback/', { params: { proyecto_ID: projectId } }).then(r => r.data)
export const createFeedback = (data: object) => api.post('/feedback/feedback/', data).then(r => r.data)
export const deleteFeedback = (id: string) => api.delete(`/feedback/feedback/${id}/`).then(r => r.data)

// ── Historial ─────────────────────────────────────────────────
export const getHistorial = (proyectoId: string) => api.get('/historial/cambios/', { params: { proyecto_ID: proyectoId } }).then(r => r.data)

// ── Departments ───────────────────────────────────────────────
export const getDepartments   = ()             => api.get('/departments/departamentos/').then(r => r.data)
export const createDepartment = (data: object) => api.post('/departments/departamentos/', data).then(r => r.data)
export const updateDepartment = (id: string, data: object) => api.put(`/departments/departamentos/${id}/`, data).then(r => r.data)
export const deleteDepartment = (id: string)   => api.delete(`/departments/departamentos/${id}/`).then(r => r.data)
export const getDirections    = ()             => api.get('/departments/direcciones/').then(r => r.data)
export const createDirection  = (data: object) => api.post('/departments/direcciones/', data).then(r => r.data)
export const updateDirection  = (id: string, data: object) => api.put(`/departments/direcciones/${id}/`, data).then(r => r.data)
export const deleteDirection  = (id: string)   => api.delete(`/departments/direcciones/${id}/`).then(r => r.data)

// ── Delegaciones ──────────────────────────────────────────────
export const getDelegaciones = (projectId: string) =>
  api.get('/projects/delegaciones/', { params: { proyecto_ID: projectId } }).then(r => r.data)
export const createDelegacion = (data: object) =>
  api.post('/projects/delegaciones/', data).then(r => r.data)
export const deleteDelegacion = (id: string) =>
  api.delete(`/projects/delegaciones/${id}/`).then(r => r.data)

// ── Ajustes de presupuesto ────────────────────────────────────
export const getAjustes = (params: { proyecto_ID?: string; tarea_ID?: string }) =>
  api.get('/projects/ajustes-presupuesto/', { params }).then(r => r.data)
export const createAjuste = (data: object) =>
  api.post('/projects/ajustes-presupuesto/', data).then(r => r.data)
export const deleteAjuste = (id: string) =>
  api.delete(`/projects/ajustes-presupuesto/${id}/`).then(r => r.data)

// ── Notificaciones ────────────────────────────────────────────
export const getNotificaciones = (soloNoLeidas = false) =>
  api
    .get('/notifications/notificaciones/', {
      params: { page_size: 30, ...(soloNoLeidas ? { no_leidas: 1 } : {}) },
    })
    .then(r => r.data)
export const marcarLeida = (id: string) =>
  api.patch(`/notifications/notificaciones/${id}/`, { leida: true }).then(r => r.data)
export const marcarTodasLeidas = () =>
  api.post('/notifications/notificaciones/marcar_todas_leidas/').then(r => r.data)
export const getResumenLogin = () =>
  api.get('/notifications/notificaciones/resumen/', { timeout: 4_000 }).then(r => r.data)

export const completarOnboarding = () =>
  api.post('/users/completar-onboarding/').then(r => r.data)
export const logout = (refresh: string) =>
  api.post('/users/logout/', { refresh }).then(r => r.data)
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
  publicApi.get(`/public/projects/${id}/`).then(r => r.data)

// ── Config ────────────────────────────────────────────────────
export const getEstados      = ()             => api.get('/projects/estados/').then(r => r.data)
export const createEstado    = (data: object) => api.post('/projects/estados/', data).then(r => r.data)
export const updateEstado    = (id: string, d: object) => api.put(`/projects/estados/${id}/`, d).then(r => r.data)
export const deleteEstado    = (id: string)   => api.delete(`/projects/estados/${id}/`).then(r => r.data)
export const getPrioridades  = ()             => api.get('/projects/prioridades/').then(r => r.data)
export const createPrioridad = (data: object) => api.post('/projects/prioridades/', data).then(r => r.data)
export const updatePrioridad = (id: string, d: object) => api.put(`/projects/prioridades/${id}/`, d).then(r => r.data)
export const deletePrioridad = (id: string)   => api.delete(`/projects/prioridades/${id}/`).then(r => r.data)
export const getTipos        = ()             => api.get('/projects/tipos/').then(r => r.data)
export const createTipo      = (data: object) => api.post('/projects/tipos/', data).then(r => r.data)
export const updateTipo      = (id: string, d: object) => api.put(`/projects/tipos/${id}/`, d).then(r => r.data)
export const deleteTipo      = (id: string)   => api.delete(`/projects/tipos/${id}/`).then(r => r.data)
