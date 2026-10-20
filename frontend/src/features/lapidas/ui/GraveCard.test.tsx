import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Grave } from '../model/lapida'
import { GraveCard } from './GraveCard'

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

describe('GraveCard', () => {
  it('muestra el epitafio en la tarjeta', () => {
    render(<GraveCard lapida={lapida()} categoria="Cactus" onAbrir={vi.fn()} />)

    expect(screen.getByText(/Se fue en paz, seco, digno\./)).toBeTruthy()
  })

  it('muestra el epitafio también en la variante baja', () => {
    render(<GraveCard lapida={lapida()} tamano="baja" categoria="Cactus" onAbrir={vi.fn()} />)

    expect(screen.getByText(/Se fue en paz, seco, digno\./)).toBeTruthy()
  })

  it('muestra el username del dueño, no el texto libre de `autor`', () => {
    const { container } = render(
      <GraveCard lapida={lapida({ autor: 'Anónimo' })} categoria="Cactus" onAbrir={vi.fn()} />,
    )

    expect(container.querySelector('.lapida__autor')!.textContent).toBe('por @zombie')
  })
})
