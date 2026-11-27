import { useQuery } from '@tanstack/react-query'
import { getCampos } from '@/lib/api'
import type { AplicaA, CampoPersonalizado, TipoDeDato, ValorDeCampo, ValoresDeCampos } from '@/types'
import { formatDate } from '@/lib/utils'

export const NOMBRE_DE_TIPO_DE_DATO: Record<TipoDeDato, string> = {
  texto: 'Texto', numero: 'Número', fecha: 'Fecha', lista: 'Lista', si_no: 'Sí o no',
}

/** Lo que se escribe en el formulario: todo como texto, se convierte al enviar. */
export type FormDeCampos = Record<string, string>

export function useCampos() {
  return useQuery<CampoPersonalizado[]>({ queryKey: ['campos'], queryFn: getCampos })
}

/** Los activos que aplican: los de todos los tipos y los de alguno de estos (las tareas usan el tipo del proyecto). */
export function camposQueAplican(campos: CampoPersonalizado[], aplicaA: AplicaA, tipos: string[]) {
  return campos.filter(c => c.activo && c.aplica_a === aplicaA && (c.tipos.length === 0 || c.tipos.some(t => tipos.includes(t))))
}

export function formDeCampos(campos: CampoPersonalizado[], valores?: ValoresDeCampos): FormDeCampos {
  return Object.fromEntries(campos.map(c => {
    const v = valores?.[c.campo_ID]
    if (c.tipo_dato === 'si_no') return [c.campo_ID, v === true ? 'si' : v === false ? 'no' : '']
    return [c.campo_ID, v == null ? '' : String(v)]
  }))
}

/** Vacío va como null (el servidor lo borra), los números como número y sí o no como booleano. */
export function camposParaEnviar(campos: CampoPersonalizado[], form: FormDeCampos): Record<string, ValorDeCampo | null> {
  return Object.fromEntries(campos.map(c => {
    const v = (form[c.campo_ID] ?? '').trim()
    if (v === '') return [c.campo_ID, null]
    if (c.tipo_dato === 'numero') return [c.campo_ID, Number(v)]
    if (c.tipo_dato === 'si_no') return [c.campo_ID, v === 'si']
    return [c.campo_ID, v]
  }))
}

/** Al editar se manda solo lo que se tocó: no se pisa lo que otra persona guardó mientras tanto. */
export function cambiosParaEnviar(campos: CampoPersonalizado[], form: FormDeCampos, tocados: FormDeCampos) {
  const cambiados = campos.filter(c => c.campo_ID in tocados)
  return cambiados.length ? { campos_extra: camposParaEnviar(cambiados, form) } : {}
}

/** El obligatorio ya tiene valor guardado (al editar, ese no se puede vaciar). */
export const yaTieneValor = (valores?: ValoresDeCampos) => (c: CampoPersonalizado) =>
  c.obligatorio && valores?.[c.campo_ID] != null && valores[c.campo_ID] !== ''

/** El primer obligatorio sin llenar, para avisar antes de mandar. */
export function obligatorioFaltante(campos: CampoPersonalizado[], form: FormDeCampos): string | null {
  const falta = campos.find(c => c.obligatorio && !(form[c.campo_ID] ?? '').trim())
  return falta ? `Complete «${falta.nombre}»` : null
}

function valorLegible(campo: CampoPersonalizado, valor: ValorDeCampo): string {
  if (campo.tipo_dato === 'si_no') return valor ? 'Sí' : 'No'
  if (campo.tipo_dato === 'fecha') return formatDate(String(valor))
  if (campo.tipo_dato === 'numero') return new Intl.NumberFormat('es-CR', { maximumFractionDigits: 4 }).format(Number(valor))
  return String(valor)
}

/** Los datos que tienen valor, en el orden del catálogo (también los de campos ya desactivados). */
export function datosConValor(campos: CampoPersonalizado[], valores?: ValoresDeCampos) {
  return campos
    .filter(c => valores?.[c.campo_ID] != null && valores[c.campo_ID] !== '')
    .map(c => ({ campo: c, texto: valorLegible(c, valores![c.campo_ID]) }))
}
