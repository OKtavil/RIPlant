import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Session } from '../../sesiones/model/sesion'
import type { Grave } from '../model/lapida'
import { DetallePage } from './DetallePage'

/**
 * `DetallePage` monta `ListaComentarios`, que sale a la red al montar. Se
 * mockea acá para que estos tests sean de la ficha y no del cliente HTTP: sin
 * esto dependen de que haya un backend vivo en `localhost:3000`.
 */
beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json([])))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function lapida(parcial: Partial<Grave> = {}): Grave {
  return {
    id: 1,
    nombrePlanta: 'Pepino',
    epitafio: 'Se fue',
    fechaFallecimiento: '2025-01-01',
    fechaPublicacion: '2025-01-02',
    autor: 'Anónimo',
    categoriaId: 1,
    causaMuerte: 'Poca luz',
    fotoUrl: '',
    coronasCount: 3,
    usuarioId: 'u1',
    duenio: { username: 'zombie', rol: 'zombie' },
    ...parcial,
  }
}

const sesionDuenia: Session = {
  id: 'u1',
  username: 'zombie',
  rol: 'usuario',
  expiraEn: '2026-10-20T00:00:00.000Z',
}

function montar(opciones: { lapida?: Grave; sesion?: Session | null } = {}) {
  return render(
    <DetallePage
      lapida={opciones.lapida ?? lapida()}
      categorias={[{ id: 1, nombre: 'Cactus' }]}
      sesion={opciones.sesion ?? null}
      onCorona={vi.fn().mockResolvedValue(undefined)}
      onBorrar={vi.fn().mockResolvedValue(undefined)}
      onVolver={vi.fn()}
    />,
  )
}

describe('DetallePage', () => {
  it('muestra el username del dueño resuelto, no el texto libre de `autor`', () => {
    const { container } = montar()

    expect(container.querySelector('.detalle__autor')!.textContent).toBe('por @zombie')
  })

  it('no muestra el botón de borrar sin sesión', () => {
    montar({ sesion: null })

    expect(screen.queryByRole('button', { name: /borrar/i })).toBeNull()
  })

  it('muestra el botón de borrar al dueño de la lápida', () => {
    montar({ sesion: sesionDuenia })

    expect(screen.getByRole('button', { name: /borrar la lápida/i })).toBeTruthy()
  })

  it('no muestra el botón de borrar a un tercero', () => {
    montar({ sesion: { ...sesionDuenia, id: 'u-otro', username: 'otra' } })

    expect(screen.queryByRole('button', { name: /borrar/i })).toBeNull()
  })

  it('muestra el botón de borrar al admin aunque no sea el dueño', () => {
    montar({ sesion: { ...sesionDuenia, username: 'admin', rol: 'admin' } })

    expect(screen.getByRole('button', { name: /borrar la lápida/i })).toBeTruthy()
  })

  it('deja todos los datos en la columna izquierda', () => {
    const { container } = montar({ sesion: sesionDuenia })

    const izquierda = container.querySelector('.detalle__info')!
    // Todo junto: la columna izquierda es la que tiene la información.
    expect(izquierda.querySelector('.detalle__epitafio')).toBeTruthy()
    expect(izquierda.querySelector('.detalle__titulo')).toBeTruthy()
    expect(izquierda.querySelector('.detalle__autor')).toBeTruthy()
    expect(izquierda.querySelector('.detalle__datos')).toBeTruthy()
    expect(izquierda.querySelector('.detalle__corona')).toBeTruthy()
    expect(izquierda.querySelector('.detalle__borrar')).toBeTruthy()
  })

  it('deja solo los comentarios en la columna derecha', () => {
    const { container } = montar({ sesion: sesionDuenia })

    const derecha = container.querySelector('.detalle__comentarios')!
    expect(derecha).toBeTruthy()
    // La lista real de comentarios está montada ahí, no un placeholder.
    expect(derecha.querySelector('.detalle__comentarios-titulo')!.textContent).toBe('COMENTARIOS')
    expect(derecha.querySelector('input')).toBeTruthy()
    // El resto de la información no se cuela en la columna de comentarios.
    expect(derecha.querySelector('.detalle__titulo')).toBeNull()
    expect(derecha.querySelector('.detalle__datos')).toBeNull()
    expect(derecha.querySelector('.detalle__corona')).toBeNull()
    expect(derecha.querySelector('.detalle__borrar')).toBeNull()
    expect(derecha.querySelector('.detalle__epitafio')).toBeNull()
  })

  it('pide los comentarios de la lápida que está mostrando', () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json([]))
    vi.stubGlobal('fetch', fetchMock)

    montar({ lapida: lapida({ id: 42 }) })

    expect(fetchMock.mock.calls[0][0]).toContain('/lapidas/42/comentarios')
  })

  it('la foto también vive en la columna izquierda', () => {
    const { container } = montar()

    const izquierda = container.querySelector('.detalle__info')!
    expect(izquierda.querySelector('.detalle__foto')).toBeTruthy()
  })

  it('agrupa los detalles del texto en una card dentro del panel', () => {
    const { container } = montar({ sesion: sesionDuenia })

    const card = container.querySelector('.detalle__card')!
    expect(card).toBeTruthy()
    expect(card.querySelector('.detalle__titulo')).toBeTruthy()
    expect(card.querySelector('.detalle__autor')).toBeTruthy()
    expect(card.querySelector('.detalle__epitafio')).toBeTruthy()
    expect(card.querySelector('.detalle__datos')).toBeTruthy()
  })

  it('deja la foto y los botones fuera de la card de detalles', () => {
    const { container } = montar({ sesion: sesionDuenia })

    const card = container.querySelector('.detalle__card')!
    const panel = container.querySelector('.detalle__info')!

    // La foto y las acciones viven en el panel, pero no dentro de la card.
    expect(card.querySelector('.detalle__foto')).toBeNull()
    expect(card.querySelector('.detalle__acciones')).toBeNull()
    expect(panel.querySelector('.detalle__foto')).toBeTruthy()
    expect(panel.querySelector('.detalle__acciones')).toBeTruthy()
  })

  it('ordena los detalles: foto, card de texto, acciones', () => {
    const { container } = montar({ sesion: sesionDuenia })

    const panel = container.querySelector('.detalle__info')!
    const orden = ['.detalle__foto', '.detalle__card', '.detalle__acciones'].map((sel) =>
      panel.querySelector(sel),
    )

    // Ninguno puede faltar: si falta, el orden no significa nada.
    orden.forEach((nodo) => expect(nodo).toBeTruthy())

    // Y tienen que aparecer en ese orden exacto dentro del panel.
    const posiciones = orden.map((nodo) =>
      Array.from(panel.querySelectorAll('*')).indexOf(nodo as Element),
    )
    expect(posiciones).toEqual([...posiciones].sort((a, b) => a - b))
  })

  it('dentro de la card ordena título, autor, epitafio y datos', () => {
    const { container } = montar({ sesion: sesionDuenia })

    const card = container.querySelector('.detalle__card')!
    const orden = [
      '.detalle__titulo',
      '.detalle__autor',
      '.detalle__epitafio',
      '.detalle__datos',
    ].map((sel) => card.querySelector(sel))

    orden.forEach((nodo) => expect(nodo).toBeTruthy())

    const posiciones = orden.map((nodo) =>
      Array.from(card.querySelectorAll('*')).indexOf(nodo as Element),
    )
    expect(posiciones).toEqual([...posiciones].sort((a, b) => a - b))
  })
})
