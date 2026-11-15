import { fireEvent, render, screen, within } from '@testing-library/react'
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
  insignias: [],
  expiraEn: '2026-10-20T00:00:00.000Z',
}

function montar(opciones: {
  lapida?: Grave
  sesion?: Session | null
  onRevivir?: (lapida: Grave) => Promise<void>
} = {}) {
  return render(
    <DetallePage
      lapida={opciones.lapida ?? lapida()}
      categorias={[{ id: 1, nombre: 'Cactus' }]}
      sesion={opciones.sesion ?? null}
      onCorona={vi.fn().mockResolvedValue(undefined)}
      onBorrar={vi.fn().mockResolvedValue(undefined)}
      onRevivir={opciones.onRevivir ?? vi.fn().mockResolvedValue(undefined)}
      onVolver={vi.fn()}
      onNavegar={vi.fn()}
    />,
  )
}

describe('DetallePage', () => {
  it('enlaza el username del dueño al perfil, no el texto libre de `autor`', () => {
    const onNavegar = vi.fn()
    const { container } = render(
      <DetallePage
        lapida={lapida()}
        categorias={[{ id: 1, nombre: 'Cactus' }]}
        sesion={null}
        onCorona={vi.fn().mockResolvedValue(undefined)}
        onBorrar={vi.fn().mockResolvedValue(undefined)}
        onRevivir={vi.fn().mockResolvedValue(undefined)}
        onVolver={vi.fn()}
        onNavegar={onNavegar}
      />,
    )

    const autor = container.querySelector('.detalle__autor')!
    const enlace = autor.querySelector('a')!
    expect(autor.textContent).toBe('por @zombie')
    expect(enlace.getAttribute('href')).toBe('/perfiles/zombie')
    fireEvent.click(enlace)
    expect(onNavegar).toHaveBeenCalledWith('/perfiles/zombie')
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

  it('confirma revivir con el mismo modal de borrar antes de ejecutar la acción', async () => {
    const onRevivir = vi.fn().mockResolvedValue(undefined)
    const confirmNativo = vi.fn()
    vi.stubGlobal('confirm', confirmNativo)
    montar({ sesion: sesionDuenia, onRevivir })

    fireEvent.click(screen.getByRole('button', { name: /^REVIVIR$/ }))
    await screen.findByText('Todavía no hay comentarios. Sé el primero en dejar una flor.')

    expect(screen.getByRole('dialog')).toBeTruthy()
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('heading', { name: 'REVIVIR LÁPIDA' })).toBeTruthy()
    expect(onRevivir).not.toHaveBeenCalled()
    expect(confirmNativo).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'CANCELAR' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(onRevivir).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: /^REVIVIR$/ }))
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: /^REVIVIR$/ }),
    )
    expect(onRevivir).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }))
  })

  it('ofrece quitar la corona cuando ya le di corona', () => {
    montar({ lapida: lapida({ coronadaPorMi: true }) })

    expect(screen.getByRole('button', { name: /quitar la corona/i })).toBeTruthy()
  })

  it('ofrece dar la corona cuando no le di corona', () => {
    montar({ lapida: lapida({ coronadaPorMi: false }) })

    expect(screen.getByRole('button', { name: /dar una corona/i })).toBeTruthy()
  })

  it('muestra la foto real cuando la lápida tiene fotoUrl', () => {
    const { container } = montar({ lapida: lapida({ fotoUrl: '/uploads/abc.png' }) })

    const img = container.querySelector('.detalle__foto-img') as HTMLImageElement
    expect(img).toBeTruthy()
    expect(img.getAttribute('src')).toBe('/uploads/abc.png')
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

    // La foto pasa a ser el primer elemento de la card; las acciones siguen
    // separadas del texto.
    expect(card.querySelector('.detalle__foto')).toBeTruthy()
    expect(card.querySelector('.detalle__acciones')).toBeNull()
    expect(card.firstElementChild?.className).toContain('detalle__foto')
    expect(panel.querySelector('.detalle__acciones')).toBeTruthy()
  })

  it('ordena la card de información antes de las acciones', () => {
    const { container } = montar({ sesion: sesionDuenia })

    const panel = container.querySelector('.detalle__info')!
    const orden = ['.detalle__card', '.detalle__acciones'].map((sel) =>
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

  it('ubica la imagen al inicio de la card antes del contenido textual', () => {
    const { container } = montar({ lapida: lapida({ fotoUrl: '/uploads/planta.png' }) })
    const card = container.querySelector('.detalle__card')!
    const foto = card.querySelector('.detalle__foto')!
    const titulo = card.querySelector('.detalle__titulo')!

    expect(Array.from(card.children).indexOf(foto)).toBe(0)
    expect(Array.from(card.children).indexOf(foto)).toBeLessThan(
      Array.from(card.children).indexOf(titulo),
    )
  })

  describe('estado resucitada (S5)', () => {
    it('reserva el hueco del rótulo aunque la lápida no haya revivido', () => {
      const { container } = montar({ lapida: lapida({ resucitada: false }) })

      const card = container.querySelector('.detalle__card')!
      const rotulo = card.querySelector('.detalle__resucitada')!

      expect(rotulo).toBeTruthy()
      expect(rotulo.getAttribute('aria-hidden')).toBe('true')
      expect(rotulo.textContent).toContain('RESUCITADA')
      expect(card.className).not.toContain('detalle__card--resucitada')
    })

    it('ubica el rótulo arriba del título', () => {
      const { container } = montar({ lapida: lapida({ resucitada: false }) })

      const card = container.querySelector('.detalle__card')!
      const foto = card.firstElementChild!
      const rotulo = card.querySelector('.detalle__resucitada')!

      expect(foto.className).toBe('detalle__foto')
      expect(rotulo.previousElementSibling).toBe(foto)
      expect(rotulo.nextElementSibling?.className).toBe('detalle__titulo')
    })

    it('muestra el rótulo RESUCITADA en una lápida que revivió', () => {
      const { container } = montar({
        lapida: lapida({ resucitada: true, resucitadaEn: '2026-10-20T00:00:00.000Z' }),
      })

      const card = container.querySelector('.detalle__card')!
      expect(card.className).toContain('detalle__card--resucitada')

      const rotulo = container.querySelector('.detalle__resucitada')!
      expect(rotulo.getAttribute('aria-hidden')).toBeNull()
      expect(rotulo.textContent).toContain('RESUCITADA')
    })

    it('el rótulo tiene etiqueta accesible, no solo color', () => {
      montar({ lapida: lapida({ resucitada: true, resucitadaEn: '2026-10-20T00:00:00.000Z' }) })

      // El estado no puede depender del color: tiene que anunciarse.
      expect(screen.getByLabelText(/lápida resucitada/i)).toBeTruthy()
    })
  })
})
