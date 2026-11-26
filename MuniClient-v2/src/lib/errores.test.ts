import { describe, expect, it } from 'vitest'
import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios'
import { esNoEncontrado, mensajeDeError } from './errores'

function errorHttp(status: number, data: unknown): AxiosError {
  const config = { headers: new AxiosHeaders() }
  const response = { status, data, statusText: '', headers: {}, config } as AxiosResponse
  return new AxiosError('fallo', 'ERR_BAD_RESPONSE', config, {}, response)
}

describe('mensajeDeError', () => {
  it('sin respuesta del servidor avisa que no hay conexión', () => {
    const err = new AxiosError('Network Error', 'ERR_NETWORK')
    expect(mensajeDeError(err, 'x')).toMatch(/No hay conexión/)
  })

  it('usa el campo error o detail del servidor', () => {
    expect(mensajeDeError(errorHttp(400, { error: 'El enlace venció.' }), 'x')).toBe('El enlace venció.')
    expect(mensajeDeError(errorHttp(429, { detail: 'Demasiadas solicitudes.' }), 'x')).toBe('Demasiadas solicitudes.')
  })

  it('nombra el campo con su etiqueta legible', () => {
    const err = errorHttp(400, { fecha_entrega: ['Este campo es requerido.'] })
    expect(mensajeDeError(err, 'x')).toBe('Fecha de entrega: Este campo es requerido.')
  })

  it('no antepone etiqueta a los errores generales', () => {
    expect(mensajeDeError(errorHttp(400, { non_field_errors: ['Datos inválidos.'] }), 'x')).toBe('Datos inválidos.')
  })

  it('explica los 5xx y los 403 sin cuerpo útil', () => {
    expect(mensajeDeError(errorHttp(502, '<html>'), 'x')).toMatch(/servidor tuvo un problema/)
    expect(mensajeDeError(errorHttp(403, {}), 'x')).toMatch(/permisos/)
  })

  it('con otros errores devuelve el texto por defecto', () => {
    expect(mensajeDeError(new Error('raro'), 'Por defecto')).toBe('Por defecto')
    expect(mensajeDeError(errorHttp(400, {}), 'Por defecto')).toBe('Por defecto')
  })
})

describe('esNoEncontrado', () => {
  it('distingue el 404 de otros errores', () => {
    expect(esNoEncontrado(errorHttp(404, {}))).toBe(true)
    expect(esNoEncontrado(errorHttp(500, {}))).toBe(false)
  })
})
