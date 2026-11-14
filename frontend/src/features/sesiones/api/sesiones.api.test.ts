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
      Response.json({ id: 1, username: 'admin', rol: 'admin', insignias: [], expiraEn: '2026-10-20T00:00:00.000Z' }),
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
      Response.json({ id: 1, username: 'admin', rol: 'admin', insignias: [], expiraEn: '2026-10-20T00:00:00.000Z' }),
    )

    await sesionesApi.iniciar({ username: 'admin', password: 'clave-de-prueba' })

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(`${BASE}/sesiones`)
    expect(init.method).toBe('POST')
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' })
    expect(init.body).toBe(JSON.stringify({ username: 'admin', password: 'clave-de-prueba' }))
  })

  it('registrar hace POST /usuarios y separa la sesión del código de recuperación', async () => {
    conRespuesta(
      Response.json({
        id: 2,
        username: 'pepe',
        rol: 'usuario',
        insignias: [],
        expiraEn: '2026-10-20T00:00:00.000Z',
        codigoRecuperacion: 'ABCD-EFGH-IJKL-MNOP',
      }),
    )

    const { sesion, codigoRecuperacion } = await sesionesApi.registrar({
      username: 'pepe',
      password: 'clave-de-prueba',
    })

    expect(sesion).toMatchObject({ username: 'pepe', rol: 'usuario' })
    // El código no es parte de la sesión: mezclarlos lo dejaría guardado junto
    // al usuario en cualquier lugar que persista la sesión.
    expect(sesion).not.toHaveProperty('codigoRecuperacion')
    expect(codigoRecuperacion).toBe('ABCD-EFGH-IJKL-MNOP')
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(`${BASE}/usuarios`)
    expect(init.method).toBe('POST')
    expect(init.credentials).toBe('include')
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' })
    expect(init.body).toBe(JSON.stringify({ username: 'pepe', password: 'clave-de-prueba' }))
  })

  it('un 409 en registrar se propaga como ApiError conflicto', async () => {
    conRespuesta(Response.json({ statusCode: 409 }, { status: 409 }))

    await expect(sesionesApi.registrar({ username: 'pepe', password: 'clave-de-prueba' })).rejects.toMatchObject({
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

  it('recuperar hace POST /usuarios/recuperar y devuelve el mensaje del backend', async () => {
    conRespuesta(Response.json({ mensaje: 'Tu contraseña se actualizó. Iniciá sesión con la nueva.' }))

    const resultado = await sesionesApi.recuperar({
      username: 'pepe',
      codigo: 'ABCD-EFGH-IJKL-MNOP',
      password: 'clave-nueva-1',
    })

    expect(resultado.mensaje).toBe('Tu contraseña se actualizó. Iniciá sesión con la nueva.')
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    // No cuelga de /sesiones porque se usa, justamente, sin sesión.
    expect(url).toBe(`${BASE}/usuarios/recuperar`)
    expect(init.method).toBe('POST')
    expect(init.credentials).toBe('include')
    expect(init.body).toBe(
      JSON.stringify({ username: 'pepe', codigo: 'ABCD-EFGH-IJKL-MNOP', password: 'clave-nueva-1' }),
    )
  })

  it('un 400 en recuperar se propaga como ApiError invalido', async () => {
    conRespuesta(Response.json({ message: 'El usuario y el código no coinciden.' }, { status: 400 }))

    await expect(
      sesionesApi.recuperar({ username: 'pepe', codigo: 'MAL', password: 'clave-nueva-1' }),
    ).rejects.toMatchObject({ status: 400, codigo: 'invalido' })
  })
})
