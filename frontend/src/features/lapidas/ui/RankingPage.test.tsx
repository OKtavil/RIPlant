import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Asesino, Grave } from '../model/lapida'
import { RankingPage } from './RankingPage'

function lapida(parcial: Partial<Grave> = {}): Grave {
  return {
    id: 1,
    nombrePlanta: 'Pepino',
    epitafio: 'Se fue en paz, seco, digno.',
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

function montar(lapidas: Grave[], asesinos: Asesino[] = []) {
  const onNavegar = vi.fn()
  return {
    ...render(
      <RankingPage
        lapidas={lapidas}
        categorias={[{ id: 1, nombre: 'Cactus' }]}
        asesinos={asesinos}
        errorAsesinos=""
        onNavegar={onNavegar}
      />,
    ),
    onNavegar,
  }
}

describe('RankingPage', () => {
  it('muestra el epitafio en la fila del salón del honor', () => {
    montar([lapida()])

    expect(screen.getByText(/Se fue en paz, seco, digno\./)).toBeTruthy()
  })
  it('muestra el username del dueño, no el texto libre de `autor`', () => {
    const { container } = montar([lapida({ autor: 'Anónimo' })])

    expect(container.querySelector('.ranking__detalle')!.textContent).toContain('@zombie')
  })
})

describe('RankingPage — enlaces', () => {
  it('la fila del Salón del Honor es un link a la lápida, no un botón', () => {
    const { container } = montar([lapida({ id: 9 })])

    const fila = container.querySelector('.ranking__fila')!
    expect(fila.tagName).toBe('A')
    expect(fila.getAttribute('href')).toBe('/lapidas/9')
  })

  it('la fila de un asesino serial es un link a su perfil', () => {
    const { container } = montar([], [{ username: 'zombie', muertes: 3 }])

    const fila = container.querySelector('.ranking__fila')!
    expect(fila.tagName).toBe('A')
    expect(fila.getAttribute('href')).toBe('/perfiles/zombie')
  })

  it('los links navegan por el router interno sin recargar', () => {
    const { container, onNavegar } = montar([lapida({ id: 9 })])

    fireEvent.click(container.querySelector('.ranking__fila')!)

    expect(onNavegar).toHaveBeenCalledWith('/lapidas/9')
  })
})
