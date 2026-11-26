import { z } from 'zod'

// La CSP de producción no permite evaluar código como texto. Sin esto, zod prueba `new Function`
// al crear sus esquemas y el navegador registra una violación de la CSP en cada carga (la app
// funciona igual, pero ensucia la consola y los reportes). Tiene que correr antes que cualquier esquema.
z.config({ jitless: true })
