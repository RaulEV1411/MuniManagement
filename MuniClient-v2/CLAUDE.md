# MuniClient-v2 (React 19, TypeScript, Vite y Tailwind 3)

- `src/pages`: una pantalla por ruta (`src/router.tsx`). `src/components`: por módulo (projects, tareas, solicitudes, config, mapa…) y `common`.
- `src/lib/api.ts`: todas las llamadas a la API. Los ids que van en una ruta pasan por `seg()`.
- Datos con TanStack Query; la sesión en `src/store`. La marca de la institución, con `useMarca()`.
- Confirmaciones con `confirmar()` (`src/lib/confirmar.ts`) y diálogos con `Dialogo`: nunca `window.confirm` ni `alert`.
- Tema claro y oscuro con la clase `dark`. El portal público es siempre claro, con colores fijos.
- El lint usa las reglas del compilador de React: nada de `setState` sincrónico dentro de un efecto.
- **Mapa** (`src/components/mapa`): MapLibre se carga solo donde hay un mapa, y su worker sale de un blob (CSP `worker-src 'self' blob:`). Sin WebGL o sin teselas, avisa y la pantalla sigue.

## e2e (Playwright)

- Specs por módulo en `e2e/<módulo>/`; fixtures en `e2e/fixtures` (`escenario` crea datos propios por prueba, `entrar`, `esperarRespuesta`).
- Etiquetas: `@lectura` (no escribe), `@muta` (escribe sobre datos propios), `@global` (cambia algo compartido: corre al final, de a una), `@critico` (flujo vital) y `@a11y` (axe).
- Las pruebas no salen a internet: el estilo del mapa y la búsqueda de direcciones los responde la fixture (hosts `.e2e.test`).
- `transversal/accesibilidad.spec.ts` pasa axe por las pantallas en claro y oscuro: una pantalla o un diálogo nuevo se suma ahí.
