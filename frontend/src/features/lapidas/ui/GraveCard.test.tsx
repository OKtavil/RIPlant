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

  it('muestra la foto real cuando la lápida tiene fotoUrl', () => {
    const { container } = render(
      <GraveCard lapida={lapida({ fotoUrl: '/uploads/abc.png' })} onAbrir={vi.fn()} />,
    )

    const img = container.querySelector('.lapida__foto-img') as HTMLImageElement
    expect(img).toBeTruthy()
    expect(img.getAttribute('src')).toBe('/uploads/abc.png')
  })

  it('cae al placeholder cuando no hay fotoUrl', () => {
    const { container } = render(
      <GraveCard lapida={lapida({ fotoUrl: '' })} onAbrir={vi.fn()} />,
    )

    expect(container.querySelector('.lapida__foto-img')).toBeNull()
    expect(container.querySelector('.lapida__foto svg')).toBeTruthy()
  })

  describe('estado resucitada (S5)', () => {
    it('no marca la tarjeta de una lápida que nunca revivió', () => {
      const { container } = render(
        <GraveCard lapida={lapida({ resucitada: false })} onAbrir={vi.fn()} />,
      )

      const tarjeta = container.querySelector('.lapida')!
      expect(tarjeta.className).not.toContain('lapida--resucitada')
      expect(container.querySelector('.lapida__resucitada')).toBeNull()
    })

    it('marca la tarjeta con una clase propia cuando revivió', () => {
      const { container } = render(
        <GraveCard lapida={lapida({ resucitada: true })} onAbrir={vi.fn()} />,
      )

      const tarjeta = container.querySelector('.lapida')!
      expect(tarjeta.className).toContain('lapida--resucitada')
    })

    it('muestra el rótulo visible en la tarjeta, no solo el color', () => {
      const { container } = render(
        <GraveCard lapida={lapida({ resucitada: true })} onAbrir={vi.fn()} />,
      )

      const rotulo = container.querySelector('.lapida__resucitada')!
      expect(rotulo).toBeTruthy()
      expect(rotulo.textContent).toContain('RESUCITADA')
    })

    it('también marca la variante baja, que es la del perfil', () => {
      const { container } = render(
        <GraveCard lapida={lapida({ resucitada: true })} tamano="baja" onAbrir={vi.fn()} />,
      )

      expect(container.querySelector('.lapida--resucitada')).toBeTruthy()
      expect(container.querySelector('.lapida__resucitada')).toBeTruthy()
    })
  })
})
