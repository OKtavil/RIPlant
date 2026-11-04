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
    [409, 'conflicto', 'Ese registro ya existe.'],
    [429, 'limite', 'Demasiados intentos. Esperá un momento antes de reintentar.'],
    [500, 'desconocido', 'Ocurrió un error inesperado.'],
  ]

  it.each(casos)('el estado %i se traduce en ApiError %s con su mensaje', async (status, codigo, mensaje) => {
    conRespuesta(Response.json({ statusCode: status }, { status }))

    const fallo = await request('/lapidas').catch((error: unknown) => error)

    expect(fallo).toBeInstanceOf(ApiError)
    expect(fallo).toMatchObject({ status, codigo, message: mensaje })
  })

  it('propaga el mensaje concreto que devuelve el backend', async () => {
    conRespuesta(
      Response.json(
        { statusCode: 403, message: 'No podés coronarte a vos mismo', error: 'Forbidden' },
        { status: 403 },
      ),
    )

    await expect(request('/lapidas/1/corona', { method: 'POST' })).rejects.toMatchObject({
      status: 403,
      codigo: 'prohibido',
      message: 'No podés coronarte a vos mismo',
    })
  })

  it('une los mensajes de class-validator en un solo texto', async () => {
    conRespuesta(
      Response.json(
        {
          statusCode: 400,
          message: ['username must be longer than 2 characters', 'password should not be empty'],
          error: 'Bad Request',
        },
        { status: 400 },
      ),
    )

    await expect(request('/usuarios', { method: 'POST', body: {} })).rejects.toMatchObject({
      status: 400,
      codigo: 'invalido',
      message: 'username must be longer than 2 characters password should not be empty',
    })
  })

  it('usa el mensaje por defecto si el cuerpo del error no es JSON', async () => {
    conRespuesta(new Response('<html>proxy error</html>', { status: 502 }))

    await expect(request('/lapidas')).rejects.toMatchObject({
      status: 502,
      codigo: 'desconocido',
      message: 'Ocurrió un error inesperado.',
    })
  })

  it('usa el mensaje por defecto si el JSON no trae message ni error', async () => {
    conRespuesta(Response.json({ statusCode: 401 }, { status: 401 }))

    await expect(request('/sesiones')).rejects.toMatchObject({
      status: 401,
      codigo: 'no-autorizado',
      message: 'Necesitás iniciar sesión.',
    })
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
