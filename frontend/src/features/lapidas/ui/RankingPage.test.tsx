import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Grave } from '../model/lapida'
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

function montar(lapidas: Grave[]) {
  return render(
    <RankingPage
      lapidas={lapidas}
      categorias={[{ id: 1, nombre: 'Cactus' }]}
      asesinos={[]}
      errorAsesinos=""
      onAbrir={vi.fn()}
    />,
  )
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
