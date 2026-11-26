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

## Requisitos

- Un servidor Linux con Docker Engine y el plugin `docker compose`: 2 CPU, 4 GB de RAM y 20 GB de disco alcanzan para empezar.
- Un dominio o subdominio (por ejemplo, `proyectos.muni.go.cr`) con un registro DNS que apunte a la IP del servidor.
- Los puertos 80 y 443 abiertos hacia internet. Caddy los usa para obtener y renovar el certificado de Let's Encrypt.
- Una cuenta de correo SMTP y una de Cloudinary.

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

## Actualizar

```bash
git pull
docker compose up -d --build
```

La API aplica las migraciones al arrancar. **Antes de actualizar, conviene un respaldo manual** (ver abajo).

## Respaldos

- El servicio `respaldo` deja un archivo `muni-AAAA-MM-DD-HHMM.sql.gz` por día en `./respaldos` y borra los de más de `RESPALDO_DIAS` días (14 por defecto).
- Los archivos se crean con permiso 600 y la carpeta con 700: solo los lee el usuario dueño, porque tienen datos personales.
- **Copie esa carpeta fuera del servidor**, por ejemplo con `rsync` a otro equipo o a un almacenamiento de la municipalidad. Un respaldo que vive en el mismo disco no sirve si el disco falla. Si la copia sale de la red municipal, cífrela antes, por ejemplo con `age` o `gpg`.
- Respaldo manual en cualquier momento:
  ```bash
  docker compose restart respaldo
  ```
- **Restaurar** un respaldo (reemplaza los datos actuales):
  ```bash
  gunzip -c respaldos/muni-AAAA-MM-DD-HHMM.sql.gz | docker compose exec -T mysql sh -c 'mysql -u root -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"'
  ```
- Pruebe una restauración al menos una vez, en otra máquina, antes de confiar en los respaldos.

## Correo

- Lo recomendado es el **SMTP institucional** de la municipalidad. El dominio del remitente (`DEFAULT_FROM_EMAIL`) necesita **SPF** y **DKIM**; si no, los correos de activación de cuenta y los avisos caen en spam.
- Si no hay SMTP propio, se puede usar Resend o SendGrid con su clave (`RESEND_API_KEY` o `SENDGRID_API_KEY`) y un dominio verificado en ese servicio.
- Sin correo configurado, el sistema funciona, pero las personas nuevas no reciben el enlace para definir su contraseña.

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
