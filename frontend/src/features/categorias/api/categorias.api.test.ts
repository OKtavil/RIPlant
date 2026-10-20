import { afterEach, describe, expect, it, vi } from 'vitest'
import { categoriasApi } from './categorias.api'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const fetchMock = vi.fn()

afterEach(() => {
  vi.unstubAllGlobals()
  fetchMock.mockReset()
})

function conRespuesta(respuesta: Response) {
  vi.stubGlobal('fetch', fetchMock.mockResolvedValue(respuesta))
}

describe('categoriasApi', () => {
  it('findAll pide GET /categorias', async () => {
    conRespuesta(Response.json([{ id: 1, nombre: 'Suculentas' }]))

    const categorias = await categoriasApi.findAll()

    expect(categorias).toEqual([{ id: 1, nombre: 'Suculentas' }])
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(`${BASE}/categorias`)
    expect(init.method).toBe('GET')
  })

  it('create hace POST /categorias con { nombre }', async () => {
    conRespuesta(Response.json({ id: 4, nombre: 'Cactus' }))

    await categoriasApi.create('Cactus')

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(`${BASE}/categorias`)
    expect(init.method).toBe('POST')
    expect(init.body).toBe(JSON.stringify({ nombre: 'Cactus' }))
  })

  it('update hace PUT /categorias/:id con { nombre }', async () => {
    conRespuesta(Response.json({ id: 7, nombre: 'Árboles frutales' }))

    await categoriasApi.update(7, 'Árboles frutales')

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(`${BASE}/categorias/7`)
    expect(init.method).toBe('PUT')
    expect(init.body).toBe(JSON.stringify({ nombre: 'Árboles frutales' }))
  })

  it('remove hace DELETE /categorias/:id sin cuerpo y devuelve undefined', async () => {
    conRespuesta(new Response(null, { status: 204 }))

    const resultado = await categoriasApi.remove(7)

    expect(resultado).toBeUndefined()
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(`${BASE}/categorias/7`)
    expect(init.method).toBe('DELETE')
    expect(init.body).toBeUndefined()
  })

  it('un 403 de la matriz de admin se propaga como ApiError prohibido', async () => {
    conRespuesta(Response.json({ statusCode: 403 }, { status: 403 }))

    await expect(categoriasApi.create('Cactus')).rejects.toMatchObject({
      status: 403,
      codigo: 'prohibido',
    })
  })
})
