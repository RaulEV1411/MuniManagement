// Corre solo las pruebas de un módulo: su backend, los unitarios y sus e2e.
// Tabla de correlación en planning/munimanagement-estandar-pruebas.md (§2.6).
//
//   PYTHON=../.venv/bin/python npm run probar:modulo -- tareas
//   npm run probar:modulo -- solicitudes --sin-e2e
//
// La suite completa queda para el cierre de cada tanda (y la corre el CI en cada PR).
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const MODULOS = {
  proyectos: { backend: ['Projects.tests', 'Projects.test_ciclo_vida', 'Historial'], e2e: ['e2e/proyectos'] },
  tareas: { backend: ['Task'], e2e: ['e2e/tareas'] },
  solicitudes: { backend: ['Solicitudes'], e2e: ['e2e/solicitudes'] },
  permisos: { backend: ['Projects.test_permisos', 'Users'], e2e: ['e2e/usuarios/permisos.spec.ts'] },
  usuarios: { backend: ['Users'], e2e: ['e2e/usuarios'] },
  auditoria: { backend: ['Auditoria'], e2e: ['e2e/usuarios/auditoria.spec.ts'] },
  configuracion: { backend: ['Configuracion'], e2e: ['e2e/configuracion'] },
  estructura: { backend: ['Departments'], e2e: [] },
  avisos: { backend: ['Notifications'], e2e: [] },
  portal: { backend: ['Projects.tests'], e2e: ['e2e/portal'] },
  // Sesión, CSP y accesibilidad: lo que toca todo (lib/api, store, autenticación, AppShell).
  transversal: { backend: [], e2e: ['e2e/transversal'] },
}

const [modulo, ...opciones] = process.argv.slice(2)
if (!MODULOS[modulo]) {
  console.error(`Módulo desconocido: ${modulo ?? '(ninguno)'}. Opciones: ${Object.keys(MODULOS).join(', ')}`)
  process.exit(2)
}
const { backend, e2e } = MODULOS[modulo]
const cliente = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const servidor = path.join(cliente, '..', 'MuniServer')

function correr(titulo, comando, args, cwd, entorno = {}) {
  console.log(`\n▶ ${titulo}`)
  const r = spawnSync(comando, args, { cwd, stdio: 'inherit', env: { ...process.env, ...entorno } })
  if (r.status !== 0) {
    console.error(`✘ ${titulo}`)
    process.exit(r.status ?? 1)
  }
}

// Sin apps, «transversal» corre todo el backend (son unos 11 s).
correr(`Backend (${backend.join(', ') || 'todo'})`, process.env.PYTHON ?? 'python', ['manage.py', 'test', ...backend], servidor,
  { DJANGO_SETTINGS_MODULE: 'MuniServer.settings_test' })
// Los unitarios del front tardan un segundo: siempre todos.
correr('Unitarios (Vitest)', 'npx', ['vitest', 'run'], cliente)
if (e2e.length && !opciones.includes('--sin-e2e')) {
  // --no-deps: sin esto, el proyecto «global» arrastra como dependencias a todos los de «modulos» y «a11y».
  correr(`e2e (${e2e.join(', ')})`, 'npx', ['playwright', 'test', ...e2e, '--no-deps'], cliente)
}
console.log(`\n✔ ${modulo}: todo en verde`)
