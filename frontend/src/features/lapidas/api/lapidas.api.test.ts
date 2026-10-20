import { afterEach, describe, expect, it, vi } from 'vitest'
import { lapidasApi } from './lapidas.api'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const fetchMock = vi.fn()

afterEach(() => {
  vi.unstubAllGlobals()
  fetchMock.mockReset()
})

function conRespuesta(respuesta: Response) {
  vi.stubGlobal('fetch', fetchMock.mockResolvedValue(respuesta))
}

describe('lapidasApi', () => {
  it('findAll pide GET /lapidas', async () => {
    conRespuesta(Response.json([{ id: 1, nombrePlanta: 'Pepino' }]))

    const lapidas = await lapidasApi.findAll()

    expect(lapidas).toEqual([{ id: 1, nombrePlanta: 'Pepino' }])
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(`${BASE}/lapidas`)
    expect(init.method).toBe('GET')
  })

  it('asesinos pide GET /lapidas/asesinos', async () => {
    conRespuesta(Response.json([{ username: 'jardinera', muertes: 4 }]))

    const ranking = await lapidasApi.asesinos()

    expect(ranking).toEqual([{ username: 'jardinera', muertes: 4 }])
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(`${BASE}/lapidas/asesinos`)
    expect(init.method).toBe('GET')
  })

  it('create hace POST /lapidas con el payload completo', async () => {
    conRespuesta(Response.json({ id: 9 }))
    const payload = {
      nombrePlanta: 'Pepino',
      epitafio: 'Siempre recordada',
      fechaFallecimiento: '2025-01-01',
      categoriaId: 1,
      causaMuerte: 'Poca luz',
    }

    await lapidasApi.create(payload)

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(`${BASE}/lapidas`)
    expect(init.method).toBe('POST')
    expect(init.body).toBe(JSON.stringify(payload))
  })

  it('findById pide GET /lapidas/:id', async () => {
    conRespuesta(Response.json({ id: 5, nombrePlanta: 'Cactus' }))

    await lapidasApi.findById(5)

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(`${BASE}/lapidas/5`)
    expect(init.method).toBe('GET')
  })

  it('giveCorona hace POST /lapidas/:id/corona sin body', async () => {
    conRespuesta(Response.json({ id: 5, coronasCount: 1 }))

    await lapidasApi.giveCorona(5)

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(`${BASE}/lapidas/5/corona`)
    expect(init.method).toBe('POST')
    expect(init.body).toBeUndefined()
    expect(init.headers).toBeUndefined()
  })

  it('update envía el body al PUT tal cual, sin completarlo (contrato parcial, ver F1)', async () => {
    conRespuesta(Response.json({ id: 5 }))

    await lapidasApi.update(5, { epitafio: 'Nuevo epitafio' })

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(`${BASE}/lapidas/5`)
    expect(init.method).toBe('PUT')
    expect(init.body).toBe(JSON.stringify({ epitafio: 'Nuevo epitafio' }))
  })

  it('remove hace DELETE /lapidas/:id sin cuerpo y devuelve undefined', async () => {
    conRespuesta(new Response(null, { status: 204 }))

    const resultado = await lapidasApi.remove(5)

    expect(resultado).toBeUndefined()
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(`${BASE}/lapidas/5`)
    expect(init.method).toBe('DELETE')
    expect(init.body).toBeUndefined()
  })
})
