# MuniManagement

Gestión de proyectos municipales: proyectos, tareas, solicitudes con aprobación, auditoría y un portal
público de transparencia. Una instalación por institución (no es multi-tenant): todo lo propio de cada una
(nombre, marca, moneda, distritos, mapa, licencia de los datos) está en Configuración, nunca fijo en el código.

- `MuniServer/`: API en Django 5.2 y DRF (ver `MuniServer/CLAUDE.md`).
- `MuniClient-v2/`: React 19, TypeScript, Vite y Tailwind 3 (ver `MuniClient-v2/CLAUDE.md`).
- `despliegue/`: guía de producción (Docker Compose y Caddy), variables y ejemplos de los CSV de `instalar`.
- `LICENSE`: software propietario.

## Reglas

- **Idioma:** la interfaz, los mensajes de la API, los comentarios y los commits van en español, con trato de usted en la interfaz. Los identificadores siguen el estilo del archivo.
- **Permisos:** todo pasa por `MuniServer/Projects/authz.py` (`puede`, `puede_ver`, `proyectos_visibles`) y el catálogo `Projects/catalogo_permisos.py`. Un módulo nuevo dice qué permiso usa y quién lo tiene por defecto.
- **Datos personales (Ley 8968):** se pide y se muestra lo mínimo. El portal público y los datos abiertos nunca llevan datos de personas ni las lecciones de un cierre.
- **Accesibilidad:** WCAG 2.2 AA. La e2e corre axe en modo claro y oscuro; los cambios con interfaz se revisan también a la vista, en escritorio y en celular.
- **CSP:** la de producción está en `MuniClient-v2/Caddyfile` y la prueba `e2e/transversal/csp.spec.ts` la aplica al build. Un origen externo nuevo va a `connect-src` con su variable (como `MAPA_ORIGEN`).
- **Migraciones:** se regeneraron desde cero antes de la primera base real (tanda I). Desde ahí, una por cambio, sin editar las ya publicadas; la CI corre `makemigrations --check`. Los catálogos con que arranca el sistema se cargan en `seed_system`, no en migraciones de datos.
- **Dependencias:** el backend las fija con hash en `MuniServer/requirements.txt` (desde `requirements.in`); en el front manda `package-lock.json` (`npm ci`). Una nueva va con una versión de al menos dos semanas.
- **Fechas:** «hoy» es la fecha local (`hoyLocal()` en el front), nunca `toISOString().slice(0, 10)`.

## Pruebas

```bash
# Backend (desde MuniServer/): SQLite en memoria
DJANGO_SETTINGS_MODULE=MuniServer.settings_test ../.venv/bin/python manage.py test [App.modulo]

# Front (desde MuniClient-v2/)
npm run lint && npm test && npm run build

# e2e (desde MuniClient-v2/): levanta Django con datos de ejemplo y Vite
PYTHON=../.venv/bin/python npm run e2e
# Con el entorno de desarrollo ocupando 8000 y 5173:
E2E_PUERTO_API=8010 E2E_PUERTO_WEB=5183 E2E_PUERTO_PREVIEW=4183 PYTHON=../.venv/bin/python npx playwright test <ruta>
```

Mientras se desarrolla se corren las pruebas relacionadas; la e2e completa, una vez por tanda (y en la CI,
`.github/workflows/ci.yml`, que también construye las imágenes de Docker y valida el Caddyfile).
