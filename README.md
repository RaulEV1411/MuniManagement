# MuniManagement

Sistema web de gestión municipal para planificar y dar seguimiento a proyectos y tareas entre departamentos, con notificaciones, historial de cambios y una vista pública de proyectos.

Proyecto en desarrollo, hecho en equipo.

## Funcionalidades

- Proyectos con estado, prioridad, presupuesto y línea de tiempo.
- Tareas con asignación y delegación entre usuarios.
- Departamentos y direcciones, con roles y permisos.
- Notificaciones en la aplicación y por correo, y avisos diarios de vencimiento.
- Historial de cambios y comentarios.
- Panel con gráficos y reportes en PDF y Excel.
- Portal público de proyectos.
- Nombre, logo, colores, datos de soporte y moneda de cada institución, configurables desde la app.

## Tecnologías

| Parte | Tecnologías |
|---|---|
| Backend | Python 3.12, Django 5.2 LTS, Django REST Framework, JWT en cookies HttpOnly, Celery y Celery Beat, MySQL 8.4 |
| Frontend | React, TypeScript, Vite, Tailwind CSS, TanStack Query, Zustand, Recharts |
| Infraestructura | Docker Compose, Caddy (HTTPS automático) y Valkey |

## Estructura

- `MuniServer/`: API en Django, bajo `/api/v1/`, con las apps Users, Departments, Projects, Task, Notifications, Feedback, Historial y Configuracion.
- `MuniClient-v2/`: cliente web en React.
- `despliegue/`: guía de instalación en producción y plantilla de variables.

## Cómo correrlo en local

1. Crear un `.env` en la raíz con `DEBUG=True`, `DB_NAME`, `DB_PASSWORD` y, si se usan, las claves de correo y Cloudinary.
2. Levantar base, cola, API y Celery:

   ```bash
   docker compose -f docker-compose.dev.yaml up --build
   ```

3. En otra terminal, el front (su proxy manda `/api` a `localhost:8000`):

   ```bash
   cd MuniClient-v2
   npm ci
   npm run dev
   ```

## Pruebas

```bash
# Backend: SQLite en memoria, sin MySQL ni Redis
cd MuniServer
python -m venv ../.venv && ../.venv/bin/pip install -r requirements.txt
DJANGO_SETTINGS_MODULE=MuniServer.settings_test ../.venv/bin/python manage.py test

# Frontend: linter, pruebas unitarias (Vitest) y build
cd MuniClient-v2
npm run lint && npm test && npm run build

# Punta a punta (Playwright): levanta solo Django con datos de ejemplo y el front
cd MuniClient-v2
PYTHON=../.venv/bin/python npm run e2e
# Si el entorno de desarrollo ya ocupa 8000 y 5173, en otros puertos:
E2E_PUERTO_API=8002 E2E_PUERTO_WEB=5175 PYTHON=../.venv/bin/python npm run e2e
```

El CI de GitHub Actions (`.github/workflows/ci.yml`) corre todo esto en cada PR y además construye las imágenes de Docker.

## Producción

Ver [`despliegue/README.md`](despliegue/README.md).

## Equipo

- Raúl Espinoza Vindas
- [alexia19cahill](https://github.com/alexia19cahill)
- [Portian02](https://github.com/Portian02)
