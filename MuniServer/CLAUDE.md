# MuniServer (Django 5.2 y DRF)

API bajo `/api/v1/`. Apps: Users, Departments, Projects, Task, Solicitudes, Notifications, Feedback,
Historial, Auditoria y Configuracion. `MuniServer/settings.py` lee todo del entorno; `settings_test`
(SQLite en memoria, Celery en el acto, correo en memoria) y `settings_e2e` (SQLite en archivo y correos
como archivos) son para las pruebas.

## Dónde está cada cosa

- **Permisos:** `Projects/authz.py` y `Projects/catalogo_permisos.py`. Un proyecto cerrado o archivado bloquea `BLOQUEADOS_AL_CERRAR`; la única excepción es quitarlo del portal (`puede_despublicar`).
- **Consultas compartidas:** `Projects/consultas.py` (filtros, avance y presupuesto anotados en la base).
- **Portal público y datos abiertos:** `Projects/public_views.py`. Solo proyectos con `es_publico`, sin datos de personas.
- **Historial y auditoría:** `Historial` guarda los cambios de cada proyecto que se ven en «Actividad». `Auditoria` registra solo, con señales, todo cambio y cada sesión, en una cadena con hash que solo se agrega.
- **Identificación y teléfono:** `Users/identificacion.py`. **Acceso por correo:** `Users/acceso.py`. **Alta desde la terminal:** `Users/alta.py` (misma validación que la API; el correo sale al confirmar la transacción).
- **Configuración de la institución:** `Configuracion/models.py` (un solo registro, `Configuracion.actual()`).

## Comandos

- `seed_system`: estados, prioridades, roles, roles de proyecto, tipos de solicitud (una sola vez) y la cadena de la auditoría. Corre en cada arranque de la API y es idempotente: no pisa lo que la institución cambió.
- `instalar`: una institución nueva, todo o nada (ver `despliegue/README.md`). `crear_admin` y `promover_admin`, para otro administrador.
- `datos_e2e`: los datos de ejemplo de la e2e (solo con `settings.E2E`). `enviar_alertas`: los avisos de vencimiento, a mano.

## Pruebas

- Ayudantes en `MuniServer/pruebas.py`: `sembrar()`, `crear_usuario`, `crear_proyecto`, `crear_tarea` y `Escenario` (una dirección con dos departamentos, un proyecto y las personas que importan para los permisos: ver su docstring; `self.como(usuario)` autentica).
- Las pruebas de cada tanda van en su archivo (`Projects/test_t.py`, `Configuracion/test_instalar.py`…). Una prueba de permisos comprueba también a quien no debe poder.
