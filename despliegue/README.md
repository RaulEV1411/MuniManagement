# Despliegue de MuniManagement

Una instalación por municipalidad, en un servidor con Docker. Todo corre en contenedores:

| Servicio | Qué hace |
|---|---|
| `web` | Caddy: sirve el front, hace de proxy de `/api` hacia Django y saca el certificado HTTPS solo |
| `api` | Django con gunicorn. Al arrancar migra la base, siembra los catálogos fijos y junta los estáticos |
| `worker` y `beat` | Celery: correos y avisos diarios de vencimiento (8:00, hora de Costa Rica) |
| `mysql` | MySQL 8.4 LTS, con los datos en el volumen `mysql_datos` |
| `valkey` | Cola de Celery y caché del límite de intentos de login |
| `respaldo` | Un respaldo de la base al arrancar y otro cada 24 horas, en `./respaldos` |
| `respaldo_fotos` | Lo mismo con las fotos subidas (volumen `medios`) |

## Requisitos

- Un servidor Linux con Docker Engine y el plugin `docker compose`: 2 CPU, 4 GB de RAM y 20 GB de disco alcanzan para empezar.
- Un dominio o subdominio (por ejemplo, `proyectos.muni.go.cr`) con un registro DNS que apunte a la IP del servidor.
- Los puertos 80 y 443 abiertos hacia internet. Caddy los usa para obtener y renovar el certificado de Let's Encrypt.
- Una cuenta de correo SMTP. Cloudinary es opcional: por defecto las fotos se guardan en el servidor (`ALMACENAMIENTO_FOTOS=local`).

## Instalación

1. Clonar el repositorio en el servidor.
2. Copiar `despliegue/variables-produccion.ejemplo` como `.env` en la raíz y completar los valores.
3. Levantar todo:
   ```bash
   docker compose up -d --build
   ```
4. Revisar que esté sano:
   ```bash
   docker compose ps                        # api y web en «healthy»
   curl https://DOMINIO/api/v1/health/      # {"estado": "ok", "db": "ok", "cache": "ok"}
   ```
5. Crear el primer administrador:
   ```bash
   docker compose exec api python manage.py crear_admin --email ana@muni.go.cr --nombre Ana --apellido Mora --cedula 112345678
   ```
   El comando imprime un enlace para definir la contraseña, y también lo manda por correo si el correo está configurado. Para dar el rol de Administrador a alguien que ya tiene cuenta: `python manage.py promover_admin correo@muni.go.cr`.
6. Entrar como ese administrador y completar **Configuración › Institución**:
   - nombre, ubicación y logo, que se ven en el login, el menú, los reportes, el portal y la pestaña del navegador;
   - colores; el principal tiene que leerse con texto blanco encima;
   - correo y teléfono de soporte, que se muestran en Ayuda;
   - moneda.

## Actualizar

```bash
git pull
docker compose up -d --build
```

La API aplica las migraciones al arrancar. **Antes de actualizar, conviene un respaldo manual** (ver abajo).

## Respaldos

- El servicio `respaldo` deja un archivo `muni-AAAA-MM-DD-HHMM.sql.gz` por día en `./respaldos`, y `respaldo_fotos` uno `fotos-AAAA-MM-DD-HHMM.tar.gz` con las fotos. Los dos borran los de más de `RESPALDO_DIAS` días (14 por defecto).
- Los archivos se crean con permiso 600 y la carpeta con 700: solo los lee el usuario dueño, porque tienen datos personales.
- **Copie esa carpeta fuera del servidor**, por ejemplo con `rsync` a otro equipo o a un almacenamiento de la municipalidad. Un respaldo que vive en el mismo disco no sirve si el disco falla. Si la copia sale de la red municipal, cífrela antes, por ejemplo con `age` o `gpg`.
- Respaldo manual en cualquier momento:
  ```bash
  docker compose restart respaldo respaldo_fotos
  ```
- **Restaurar** un respaldo de la base (reemplaza los datos actuales). La carpeta `respaldos/` es de root con permiso 700, por eso el `sudo`:
  ```bash
  sudo gunzip -c respaldos/muni-AAAA-MM-DD-HHMM.sql.gz | docker compose exec -T mysql sh -c 'mysql -u root -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"'
  ```
- **Restaurar las fotos** (las agrega al volumen, a nombre del usuario de la API):
  ```bash
  sudo cat respaldos/fotos-AAAA-MM-DD-HHMM.tar.gz | docker compose exec -T api tar xzf - -C /app
  ```
- Pruebe una restauración al menos una vez, en otra máquina, antes de confiar en los respaldos.

## Fotos

- **Por defecto (`ALMACENAMIENTO_FOTOS=local`):**
  - se guardan en el volumen `medios` y Caddy las sirve en `/api/v1/media/`;
  - quedan en el servidor de la municipalidad y entran en los respaldos;
  - se aceptan JPG, PNG y WebP de hasta 5 MB; el nombre del archivo lo pone el sistema.
- **Con `ALMACENAMIENTO_FOTOS=cloudinary`:**
  - se suben a Cloudinary, en EE. UU., y además se acepta HEIC;
  - hacen falta las claves `CLOUDINARY_*` y un contrato de encargado de datos, porque hay fotos de funcionarios (Ley 8968).
- Si una instalación pasa de Cloudinary a disco local, las fotos viejas se siguen viendo desde Cloudinary y las nuevas van al disco.

## Correo

- Lo recomendado es el **SMTP institucional** de la municipalidad. El dominio del remitente (`DEFAULT_FROM_EMAIL`) necesita **SPF** y **DKIM**; si no, los correos de activación de cuenta y los avisos caen en spam.
- Si no hay SMTP propio, se puede usar Resend o SendGrid con su clave (`RESEND_API_KEY` o `SENDGRID_API_KEY`) y un dominio verificado en ese servicio.
- Sin correo configurado, el sistema funciona, pero las personas nuevas no reciben el enlace para definir su contraseña.

## Mapa y portal

- **Mapa:** por defecto usa [OpenFreeMap](https://openfreemap.org). Es gratuito, sin clave ni límite de vistas, con datos de OpenStreetMap, pero no garantiza el servicio. Si no carga, el portal lo avisa y sigue mostrando la lista.
  - Para teselas propias o de un proveedor, ponga en el `.env` `MAPA_ESTILO` (la URL del estilo) y `MAPA_ORIGEN` (su origen, que entra en la CSP), y vuelva a construir `web`.
  - La búsqueda de direcciones usa Nominatim, de la misma forma: con `BUSQUEDA_DIRECCIONES` y `BUSQUEDA_ORIGEN`.
- **Datos abiertos:** el portal ofrece `/api/v1/public/datos/proyectos.csv` y `.json`, con la licencia que se elige en Configuración › Institución.
- **Vista previa al compartir:** cuando alguien comparte un enlace del portal en WhatsApp, Facebook, X, LinkedIn, Slack o Telegram, Caddy le pasa el pedido de ese robot a Django, que responde el título, la descripción y la foto del proyecto.

## Monitoreo

- `GET /api/v1/health/` responde 200 si la API llega a la base y a la caché, y 503 si no. Sirve para un monitor externo, como UptimeRobot.
- Los logs salen en JSON, una línea por evento:
  ```bash
  docker compose logs -f api worker beat
  ```
- Con `SENTRY_DSN` en el `.env`, los errores del backend llegan a Sentry, sin IP, cookies ni datos de la persona.

## Seguridad

- Solo HTTPS:
  - Caddy redirige HTTP a HTTPS;
  - Django exige HTTPS y manda HSTS;
  - las cookies de sesión son HttpOnly y Secure.
- La API, la base y Valkey no exponen puertos: solo `web` publica el 80 y el 443.
- Los contenedores de la API corren sin root.
- Encabezados de seguridad: `Content-Security-Policy`, `X-Frame-Options` y `X-Content-Type-Options`. Si se cambia un proveedor externo, como la CDN de imágenes, hay que ajustar la política en `MuniClient-v2/Caddyfile`.

## Probar en local

Se puede levantar el mismo compose en una computadora con `DOMINIO=localhost`. Caddy usa entonces un certificado local, y el navegador avisa que no es de confianza.
