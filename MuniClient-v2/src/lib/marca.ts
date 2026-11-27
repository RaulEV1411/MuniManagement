// Identidad de la instalación: nombre, logo y colores salen de Configuración (GET público).
// Las paletas `ocean` (color principal) y `sunset` (acento) de Tailwind leen variables CSS; acá
// se recalculan sus tonos a partir de los dos colores que elige el Administrador.
export interface Marca {
  nombre: string
  ubicacion: string
  logo: string
  color_primario: string
  color_acento: string
  correo_soporte: string
  telefono_soporte: string
  horario_soporte: string
  moneda: string
  // Días que se conservan la auditoría y las sesiones cerradas.
  retencion_auditoria_dias: number
  // Distritos del cantón para la ubicación de los proyectos (vacío: se escriben a mano).
  distritos: string[]
  // Aviso de privacidad (Ley 8968): texto propio, encargados y versión.
  aviso_privacidad: string
  encargados: Encargado[]
  privacidad_version: number
  privacidad_actualizada: string | null
}

export interface Encargado { nombre: string; datos: string; finalidad: string; pais: string }

const TONOS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const
// Cuánto se mezcla con blanco (tonos claros) o con negro (oscuros) respecto del color base (500).
const MEZCLA: Record<number, [number, number]> = {
  50: [0.92, 0], 100: [0.8, 0], 200: [0.62, 0], 300: [0.42, 0], 400: [0.22, 0],
  500: [0, 0], 600: [0, 0.12], 700: [0, 0.25], 800: [0, 0.4], 900: [0, 0.55],
}

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function paleta(hex: string): Record<number, string> {
  const base = rgb(hex)
  const salida: Record<number, string> = {}
  for (const t of TONOS) {
    const [blanco, negro] = MEZCLA[t]
    const canal = (c: number) => Math.round(c + (255 - c) * blanco - c * negro)
    salida[t] = base.map(canal).join(' ')
  }
  return salida
}

/** Tono, saturación y luminosidad (0-360, 0-100, 0-100). */
function hslDe(hex: string): [number, number, number] {
  const [r, g, b] = rgb(hex).map(c => c / 255)
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l * 100]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [h * 60, s * 100, l * 100]
}

function hexDeHsl(h: number, s: number, l: number): string {
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100)
  const canal = (n: number) => {
    const k = (n + h / 30) % 12
    const c = l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
    return Math.round(c * 255).toString(16).padStart(2, '0')
  }
  return `#${canal(0)}${canal(8)}${canal(4)}`
}

function hsl(hex: string): string {
  const [h, s, l] = hslDe(hex)
  return `${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%`
}

function luminancia(hex: string): number {
  const lum = rgb(hex).map(c => c / 255).map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * lum[0] + 0.7152 * lum[1] + 0.0722 * lum[2]
}

export function contraste(a: string, b: string): number {
  const [x, y] = [luminancia(a), luminancia(b)].sort((m, n) => n - m)
  return (x + 0.05) / (y + 0.05)
}

/** Contraste WCAG entre un color y el blanco (el texto de botones y encabezados). */
export function contrasteConBlanco(hex: string): number {
  return contraste(hex, '#ffffff')
}

// Texto de los componentes sobre el «primary» de modo oscuro (--primary-foreground de .dark).
const TEXTO_OSCURO = '#121820'

/** El color principal para modo oscuro: mismo tono, más claro hasta que el texto oscuro encima se lea (4,5:1). */
export function principalParaOscuro(hex: string): string {
  const [h, s, l] = hslDe(hex)
  for (let luz = Math.max(l, 55); luz < 95; luz += 5) {
    const candidato = hexDeHsl(h, s, luz)
    if (contraste(candidato, TEXTO_OSCURO) >= 4.5) return candidato
  }
  return hexDeHsl(h, s, 95)
}

const HEX = /^#[0-9a-fA-F]{6}$/

export function aplicarMarca(marca: Marca) {
  if (typeof document === 'undefined') return
  const vars: string[] = []
  if (HEX.test(marca.color_primario)) {
    const p = paleta(marca.color_primario)
    TONOS.forEach(t => vars.push(`--ocean-${t}: ${p[t]};`))
    vars.push(`--primary: ${hsl(marca.color_primario)};`, `--ring: ${hsl(marca.color_primario)};`)
  }
  if (HEX.test(marca.color_acento)) {
    const a = paleta(marca.color_acento)
    TONOS.forEach(t => vars.push(`--sunset-${t}: ${a[t]};`))
  }
  let estilo = document.getElementById('marca-institucion') as HTMLStyleElement | null
  if (!estilo) {
    estilo = document.createElement('style')
    estilo.id = 'marca-institucion'
    document.head.appendChild(estilo)
  }
  // En modo oscuro el «primary» y el anillo de foco usan un tono más claro, como antes.
  const claro = HEX.test(marca.color_primario) ? hsl(principalParaOscuro(marca.color_primario)) : ''
  const oscuro = claro ? `.dark { --primary: ${claro}; --ring: ${claro}; }` : ''
  estilo.textContent = `:root { ${vars.join(' ')} } ${oscuro}`

  let icono = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (marca.logo) {
    if (!icono) {
      icono = document.createElement('link')
      icono.rel = 'icon'
      document.head.appendChild(icono)
    }
    icono.href = marca.logo
    icono.removeAttribute('type')
  }
}

export function formatearMonto(monto: number, moneda = 'CRC'): string {
  try {
    return new Intl.NumberFormat('es-CR', { style: 'currency', currency: moneda, currencyDisplay: 'narrowSymbol', maximumFractionDigits: 0 }).format(monto)
  } catch {
    return `${moneda} ${monto.toLocaleString('es-CR')}`
  }
}

export const MARCA_POR_DEFECTO: Marca = {
  nombre: 'Municipalidad', ubicacion: '', logo: '', color_primario: '#0C3857', color_acento: '#F3951B',
  correo_soporte: '', telefono_soporte: '', horario_soporte: '', moneda: 'CRC', retencion_auditoria_dias: 1825, distritos: [],
  aviso_privacidad: '', encargados: [], privacidad_version: 1, privacidad_actualizada: null,
}

export function simboloDe(moneda: string): string {
  try {
    const partes = new Intl.NumberFormat('es-CR', { style: 'currency', currency: moneda, currencyDisplay: 'narrowSymbol' }).formatToParts(0)
    return partes.find(x => x.type === 'currency')?.value ?? moneda
  } catch {
    return moneda
  }
}
