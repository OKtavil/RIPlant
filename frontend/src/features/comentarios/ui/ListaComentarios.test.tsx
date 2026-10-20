import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Comentario } from '../model/comentario'
import { ListaComentarios } from './ListaComentarios'

const fetchMock = vi.fn()

afterEach(() => {
  vi.unstubAllGlobals()
  fetchMock.mockReset()
})

function comentario(parcial: Partial<Comentario> = {}): Comentario {
  return {
    id: 'c1',
    lapidaId: 7,
    usuarioId: 'u1',
    autor: 'regabien_no',
    texto: 'clásico error de principiante',
    creadoEn: '2026-01-01T00:00:00.000Z',
    ...parcial,
  }
}

const SESION = {
  id: 'u9',
  username: 'jardinera',
  rol: 'usuario' as const,
  expiraEn: '2026-12-31T00:00:00.000Z',
}

/** Responde el GET de la lista y, si se pide, el POST de creación. */
function conApi(lista: Comentario[], creado?: Comentario) {
  fetchMock.mockImplementation((_url: string, init?: RequestInit) => {
    if (init?.method === 'POST') {
      return Promise.resolve(Response.json(creado ?? comentario({ id: 'nuevo' }), { status: 201 }))
    }
    return Promise.resolve(Response.json(lista))
  })
  vi.stubGlobal('fetch', fetchMock)
}

describe('ListaComentarios', () => {
  it('muestra los comentarios con el autor y el texto', async () => {
    conApi([comentario({ autor: 'manos_de_tierra', texto: 'jaja el mío duró menos' })])

    render(<ListaComentarios lapidaId={7} sesion={null} />)

    expect(await screen.findByText('@manos_de_tierra:')).toBeTruthy()
    expect(screen.getByText(/jaja el mío duró menos/)).toBeTruthy()
  })

  it('avisa cuando todavía no hay comentarios', async () => {
    conApi([])

    render(<ListaComentarios lapidaId={7} sesion={null} />)

    expect(await screen.findByText(/Todavía no hay comentarios/)).toBeTruthy()
  })

  it('sin sesión invita a entrar en vez de mostrar el formulario', async () => {
    conApi([])

    render(<ListaComentarios lapidaId={7} sesion={null} />)

    expect(await screen.findByText('Iniciá sesión para comentar.')).toBeTruthy()
    expect(screen.queryByPlaceholderText('Escribe un comentario...')).toBeNull()
  })

  it('con sesión permite escribir y agrega el comentario a la lista', async () => {
    const nuevo = comentario({ id: 'nuevo', autor: 'jardinera', texto: 'un minuto de silencio' })
    conApi([], nuevo)

    render(<ListaComentarios lapidaId={7} sesion={SESION} />)
    const campo = await screen.findByPlaceholderText('Escribe un comentario...')
    fireEvent.change(campo, { target: { value: 'un minuto de silencio' } })
    fireEvent.click(screen.getByRole('button', { name: 'COMENTAR' }))

    await waitFor(() => expect(screen.getByText('@jardinera:')).toBeTruthy())
    const [, init] = fetchMock.mock.calls.find(
      ([, i]) => (i as RequestInit)?.method === 'POST',
    ) as [string, RequestInit]
    expect(init.body).toBe(JSON.stringify({ texto: 'un minuto de silencio' }))
  })

  it('no deja enviar un comentario vacío', async () => {
    conApi([])

    render(<ListaComentarios lapidaId={7} sesion={SESION} />)
    await screen.findByPlaceholderText('Escribe un comentario...')

    fireEvent.click(screen.getByRole('button', { name: 'COMENTAR' }))

    expect(fetchMock.mock.calls.some(([, i]) => (i as RequestInit)?.method === 'POST')).toBe(false)
  })

  it('recarga los comentarios al cambiar de lápida', async () => {
    conApi([comentario()])

    const { rerender } = render(<ListaComentarios key={7} lapidaId={7} sesion={null} />)
    await screen.findByText('@regabien_no:')

    rerender(<ListaComentarios key={8} lapidaId={8} sesion={null} />)

    await waitFor(() => {
      const urls = fetchMock.mock.calls.map(([u]) => u as string)
      expect(urls.some((u) => u.endsWith('/lapidas/8/comentarios'))).toBe(true)
    })
  })
})
