# MuniManagement

Sistema web de gestión municipal para planificar y dar seguimiento a proyectos y tareas entre departamentos, con notificaciones, historial de cambios y una vista pública de proyectos.

Proyecto en desarrollo, hecho en equipo.

## Funcionalidades

- Proyectos con estado, prioridad, presupuesto y línea de tiempo.
- Tareas con asignación y delegación entre usuarios.
- Departamentos y direcciones, con roles y permisos.
- Notificaciones por correo y tareas programadas.
- Historial de cambios y retroalimentación.
- Panel y reportes con gráficos.
- Vista pública de proyectos.

## Tecnologías

| Parte | Tecnologías |
|---|---|
| Backend | Python, Django, Django REST Framework, JWT (Simple JWT), Celery y Celery Beat, Redis, MySQL |
| Frontend | React, TypeScript, Vite, Tailwind CSS, TanStack Query, Zustand, Recharts |
| Infraestructura | Docker y Docker Compose |

## Estructura

- `MuniServer/`: API en Django, con las apps Users, Departments, Projects, Task, Notifications, Feedback e Historial.
- `MuniClient-v2/`: cliente web en React.

## Cómo correrlo en local

1. Copiar `.env.example` como `.env` y completar los valores.
2. Levantar los servicios:

   ```bash
   docker compose -f docker-compose.dev.yaml up --build
   ```

## Equipo

- Raúl Espinoza Vindas
- [alexia19cahill](https://github.com/alexia19cahill)
- [Portian02](https://github.com/Portian02)
