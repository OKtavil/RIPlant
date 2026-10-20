import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, request } from './client'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const fetchMock = vi.fn()

afterEach(() => {
  vi.unstubAllGlobals()
  fetchMock.mockReset()
})

function conRespuesta(respuesta: Response) {
  vi.stubGlobal('fetch', fetchMock.mockResolvedValue(respuesta))
}

describe('request — camino feliz', () => {
  it('hace GET con credentials include y devuelve el JSON', async () => {
    conRespuesta(Response.json([{ id: 1 }]))

    const datos = await request<Array<{ id: number }>>('/lapidas')

    expect(datos).toEqual([{ id: 1 }])
    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(`${BASE}/lapidas`)
    expect(init.method).toBe('GET')
    expect(init.credentials).toBe('include')
    expect(init.headers).toBeUndefined()
    expect(init.body).toBeUndefined()
  })

  it('envía el body serializado con Content-Type json en POST', async () => {
    conRespuesta(Response.json({ id: 9 }))

    await request('/lapidas', { method: 'POST', body: { nombrePlanta: 'Pepino' } })

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(init.method).toBe('POST')
    expect(init.credentials).toBe('include')
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' })
    expect(init.body).toBe(JSON.stringify({ nombrePlanta: 'Pepino' }))
  })

  it('un 204 con sinCuerpo devuelve undefined sin intentar parsear', async () => {
    conRespuesta(new Response(null, { status: 204 }))

    const resultado = await request('/sesiones', { method: 'DELETE', sinCuerpo: true })

    expect(resultado).toBeUndefined()
  })

  it('un 204 devuelve undefined aunque no se marque sinCuerpo', async () => {
    conRespuesta(new Response(null, { status: 204 }))

    const resultado = await request<void>('/lapidas/1')

    expect(resultado).toBeUndefined()
  })
})

describe('request — errores HTTP', () => {
  const casos: Array<[number, ApiError['codigo'], string]> = [
    [400, 'invalido', 'Los datos enviados no son válidos.'],
    [401, 'no-autorizado', 'Necesitás iniciar sesión.'],
    [403, 'prohibido', 'Tu cuenta no tiene permiso para esta acción.'],
    [404, 'no-encontrado', 'El recurso solicitado no existe.'],
    [429, 'limite', 'Demasiados intentos. Esperá un momento antes de reintentar.'],
    [500, 'desconocido', 'Ocurrió un error inesperado.'],
  ]

  it.each(casos)('el estado %i se traduce en ApiError %s con su mensaje', async (status, codigo, mensaje) => {
    conRespuesta(Response.json({ statusCode: status }, { status }))

    const fallo = await request('/lapidas').catch((error: unknown) => error)

    expect(fallo).toBeInstanceOf(ApiError)
    expect(fallo).toMatchObject({ status, codigo, message: mensaje })
  })

  it('una caída de red se traduce en ApiError 0 sin-conexion', async () => {
    vi.stubGlobal('fetch', fetchMock.mockRejectedValue(new TypeError('Failed to fetch')))

    await expect(request('/lapidas')).rejects.toMatchObject({
      status: 0,
      codigo: 'sin-conexion',
      message: 'No se pudo conectar con el servidor.',
    })
  })
})
