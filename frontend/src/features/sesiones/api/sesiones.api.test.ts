import { afterEach, describe, expect, it, vi } from 'vitest'
import { sesionesApi } from './sesiones.api'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const fetchMock = vi.fn()

afterEach(() => {
  vi.unstubAllGlobals()
  fetchMock.mockReset()
})

function conRespuesta(respuesta: Response) {
  vi.stubGlobal('fetch', fetchMock.mockResolvedValue(respuesta))
}

describe('sesionesApi', () => {
  it('actual pide GET /sesiones/actual', async () => {
    conRespuesta(
      Response.json({ id: 1, username: 'admin', rol: 'admin', expiraEn: '2026-10-20T00:00:00.000Z' }),
    )

    const sesion = await sesionesApi.actual()

    expect(sesion.username).toBe('admin')
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(`${BASE}/sesiones/actual`)
    expect(init.method).toBe('GET')
    expect(init.credentials).toBe('include')
  })

  it('iniciar hace POST /sesiones con las credenciales', async () => {
    conRespuesta(
      Response.json({ id: 1, username: 'admin', rol: 'admin', expiraEn: '2026-10-20T00:00:00.000Z' }),
    )

    await sesionesApi.iniciar({ username: 'admin', password: 'riplanta123' })

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(`${BASE}/sesiones`)
    expect(init.method).toBe('POST')
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' })
    expect(init.body).toBe(JSON.stringify({ username: 'admin', password: 'riplanta123' }))
  })

  it('registrar hace POST /usuarios con las credenciales y devuelve la sesión', async () => {
    conRespuesta(
      Response.json({ id: 2, username: 'pepe', rol: 'usuario', expiraEn: '2026-10-20T00:00:00.000Z' }),
    )

    const sesion = await sesionesApi.registrar({ username: 'pepe', password: 'riplanta123' })

    expect(sesion).toMatchObject({ username: 'pepe', rol: 'usuario' })
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(`${BASE}/usuarios`)
    expect(init.method).toBe('POST')
    expect(init.credentials).toBe('include')
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' })
    expect(init.body).toBe(JSON.stringify({ username: 'pepe', password: 'riplanta123' }))
  })

  it('un 409 en registrar se propaga como ApiError conflicto', async () => {
    conRespuesta(Response.json({ statusCode: 409 }, { status: 409 }))

    await expect(sesionesApi.registrar({ username: 'pepe', password: 'riplanta123' })).rejects.toMatchObject({
      status: 409,
      codigo: 'conflicto',
    })
  })

  it('cerrar hace DELETE /sesiones sin cuerpo y devuelve undefined', async () => {    conRespuesta(new Response(null, { status: 204 }))

    const resultado = await sesionesApi.cerrar()

    expect(resultado).toBeUndefined()
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(`${BASE}/sesiones`)
    expect(init.method).toBe('DELETE')
    expect(init.body).toBeUndefined()
  })

  it('un 401 se propaga como ApiError no-autorizado', async () => {
    conRespuesta(Response.json({ statusCode: 401 }, { status: 401 }))

    await expect(sesionesApi.actual()).rejects.toMatchObject({
      status: 401,
      codigo: 'no-autorizado',
    })
  })
})
