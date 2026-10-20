import { fireEvent, render, screen } from '@testing-library/react'
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

  it('muestra el botón de corona activo cuando ya le di corona', () => {
    render(<GraveCard lapida={lapida({ coronadaPorMi: true })} onAbrir={vi.fn()} onCorona={vi.fn()} />)

    expect(screen.getByRole('button', { name: /quitar la corona/i })).toBeTruthy()
  })

  it('muestra el botón de corona inactivo cuando no le di corona', () => {
    render(<GraveCard lapida={lapida({ coronadaPorMi: false })} onAbrir={vi.fn()} onCorona={vi.fn()} />)

    expect(screen.getByRole('button', { name: /dar una corona/i })).toBeTruthy()
  })

  it('mantiene el conteo de coronas visible en los dos estados', () => {
    const { rerender } = render(
      <GraveCard lapida={lapida({ coronadaPorMi: false, coronasCount: 3 })} onAbrir={vi.fn()} onCorona={vi.fn()} />,
    )
    expect(screen.getByText('3')).toBeTruthy()

    rerender(
      <GraveCard lapida={lapida({ coronadaPorMi: true, coronasCount: 4 })} onAbrir={vi.fn()} onCorona={vi.fn()} />,
    )
    expect(screen.getByText('4')).toBeTruthy()
  })

  it('avisa al padre cuando se toca la corona', () => {
    const onCorona = vi.fn()
    const conCorona = lapida({ coronadaPorMi: true })
    render(<GraveCard lapida={conCorona} onAbrir={vi.fn()} onCorona={onCorona} />)

    fireEvent.click(screen.getByRole('button', { name: /quitar la corona/i }))

    expect(onCorona).toHaveBeenCalledWith(conCorona)
  })
})
