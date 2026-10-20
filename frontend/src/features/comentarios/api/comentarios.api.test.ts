import { afterEach, describe, expect, it, vi } from 'vitest'
import { comentariosApi } from './comentarios.api'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const fetchMock = vi.fn()

afterEach(() => {
  vi.unstubAllGlobals()
  fetchMock.mockReset()
})

function conRespuesta(respuesta: Response) {
  vi.stubGlobal('fetch', fetchMock.mockResolvedValue(respuesta))
}

describe('comentariosApi', () => {
  it('listar pide GET /lapidas/:id/comentarios', async () => {
    conRespuesta(Response.json([{ id: 'abc', texto: 'un minuto de silencio' }]))

    const comentarios = await comentariosApi.listar(7)

    expect(comentarios).toEqual([{ id: 'abc', texto: 'un minuto de silencio' }])
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(`${BASE}/lapidas/7/comentarios`)
    expect(init.method).toBe('GET')
  })

  it('crear hace POST /lapidas/:id/comentarios con solo el texto', async () => {
    conRespuesta(Response.json({ id: 'nuevo', texto: 'que en paz descanse' }))

    const creado = await comentariosApi.crear(7, 'que en paz descanse')

    expect(creado.id).toBe('nuevo')
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(`${BASE}/lapidas/7/comentarios`)
    expect(init.method).toBe('POST')
    // El autor no viaja en el cuerpo: lo pone el backend desde la sesión.
    expect(init.body).toBe(JSON.stringify({ texto: 'que en paz descanse' }))
  })
})
