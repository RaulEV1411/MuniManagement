# MuniClient-v2

Front de MuniManagement: React 19, TypeScript, Vite, Tailwind CSS, TanStack Query y Zustand.

## Comandos

```bash
npm ci            # instala las dependencias exactas del lockfile (Node 24, ver .nvmrc)
npm run dev       # servidor de desarrollo en http://localhost:5173
npm run build     # chequeo de tipos y compilación a dist/
npm run lint      # ESLint
```

## Cómo habla con la API

- La API vive en `/api/v1` del mismo dominio:
  - **Desarrollo:** el proxy de Vite (`vite.config.ts`) manda `/api` a `http://localhost:8000`. Otro destino se define con `VITE_PROXY_API`.
  - **Producción:** Caddy (`Caddyfile`) hace lo mismo hacia el contenedor `api`.
- La sesión viaja en cookies HttpOnly que fija el servidor. El front nunca ve los JWT, solo guarda en memoria el token CSRF que mandan el login y `/users/me/`.
- `src/lib/api.ts` concentra las llamadas. Los ids que van en la URL pasan por `seg()`, que exige un UUID y lo codifica.
- `src/lib/errores.ts` convierte los errores de la API en mensajes para la persona.

## Imagen de producción

`Dockerfile` compila el front y lo copia a una imagen de Caddy junto con el `Caddyfile`. Ver `../despliegue/README.md`.
