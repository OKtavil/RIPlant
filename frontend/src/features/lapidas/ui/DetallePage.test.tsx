import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Session } from '../../sesiones/model/sesion'
import type { Grave } from '../model/lapida'
import { DetallePage } from './DetallePage'

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
    // El resto de la información no se cuela en la columna de comentarios.
    expect(derecha.querySelector('.detalle__titulo')).toBeNull()
    expect(derecha.querySelector('.detalle__datos')).toBeNull()
    expect(derecha.querySelector('.detalle__corona')).toBeNull()
    expect(derecha.querySelector('.detalle__borrar')).toBeNull()
    expect(derecha.querySelector('.detalle__epitafio')).toBeNull()
  })

  it('la foto también vive en la columna izquierda', () => {
    const { container } = montar()

    const izquierda = container.querySelector('.detalle__info')!
    expect(izquierda.querySelector('.detalle__foto')).toBeTruthy()
  })
})
