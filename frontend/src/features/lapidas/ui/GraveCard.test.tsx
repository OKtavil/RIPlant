import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LIMITES_TARJETA, type Grave } from '../model/lapida'
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

  it('permite poner y quitar corona en la variante baja del perfil', () => {
    const onCorona = vi.fn()
    const { rerender } = render(
      <GraveCard
        lapida={lapida({ coronadaPorMi: false })}
        tamano="baja"
        onAbrir={vi.fn()}
        onCorona={onCorona}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /dar una corona/i }))
    expect(onCorona).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }))

    rerender(
      <GraveCard
        lapida={lapida({ coronadaPorMi: true })}
        tamano="baja"
        onAbrir={vi.fn()}
        onCorona={onCorona}
      />,
    )
    expect(screen.getByRole('button', { name: /quitar la corona/i }).className).toContain(
      'lapida__coronas--puesta',
    )
  })

  it('bloquea la auto-corona también en la variante baja', () => {
    render(
      <GraveCard
        lapida={lapida({ coronadaPorMi: false })}
        tamano="baja"
        onAbrir={vi.fn()}
        onCorona={vi.fn()}
        propia
      />,
    )

    expect(screen.getByRole('button', { name: /no podés coronar tu propia lápida/i })).toHaveProperty(
      'disabled',
      true,
    )
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

  describe('límites de texto de la tarjeta', () => {
    const largo = {
      nombrePlanta: 'Monstera deliciosa variegada dorada',
      causaMuerte:
        'Riego excesivo por aspersión y hongos en la raíz seca, sumado a un sustrato viejo que ya no drenaba y a una maceta sin agujeros.',
      epitafio:
        'Se fue en silencio una madrugada de enero, después de tres semanas sin agua, sin sol y sin que nadie se diera cuenta. La tierra quedó seca, las hojas amarillas y el recuerdo de su sombra en la ventana.',
    }

    it('muestra la categoría debajo del nombre, separada de la causa', () => {
      const { container } = render(
        <GraveCard lapida={lapida()} categoria="Cactus" onAbrir={vi.fn()} />,
      )

      const nombre = container.querySelector('.lapida__nombre')!
      const categoria = container.querySelector('.lapida__categoria')!
      const causa = container.querySelector('.lapida__causa')!

      expect(categoria.textContent).toBe('Cactus')
      expect(causa.textContent).toBe('Poca luz')
      // Nada de "Cactus · Poca luz" en una sola línea.
      expect(categoria.textContent).not.toContain('·')
      const filas = Array.from(categoria.parentElement!.children)
      expect(filas.indexOf(categoria)).toBe(filas.indexOf(nombre) + 1)
      expect(filas.indexOf(categoria)).toBeLessThan(filas.indexOf(causa))
    })

    it('recorta el nombre y la causa en un borde de palabra', () => {
      const { container } = render(
        <GraveCard lapida={lapida(largo)} categoria="Cactus" onAbrir={vi.fn()} />,
      )

      expect(container.querySelector('.lapida__nombre')!.textContent).toBe(
        '“Monstera deliciosa…”',
      )

      const causa = container.querySelector('.lapida__causa')!.textContent!
      expect(causa.length).toBeLessThanOrEqual(LIMITES_TARJETA.causa)
      expect(causa.endsWith('…')).toBe(true)
      expect(causa).not.toBe(largo.causaMuerte)
    })

    it('recorta el epitafio sin pasar del límite', () => {
      const { container } = render(<GraveCard lapida={lapida(largo)} onAbrir={vi.fn()} />)

      const epitafio = container.querySelector('.lapida__epitafio')!.textContent!
      expect(epitafio.length).toBeLessThanOrEqual(LIMITES_TARJETA.epitafio)
      expect(epitafio.endsWith('…')).toBe(true)
      expect(epitafio).not.toBe(largo.epitafio)
    })

    it('aplica los mismos límites a la variante baja, que es la del perfil', () => {
      const { container } = render(
        <GraveCard lapida={lapida(largo)} tamano="baja" onAbrir={vi.fn()} />,
      )

      expect(container.querySelector('.lapida__nombre')!.textContent).toBe(
        '“Monstera deliciosa…”',
      )
      expect(container.querySelector('.lapida__causa')!.textContent!.endsWith('…')).toBe(true)
      expect(container.querySelector('.lapida__epitafio')!.textContent!.endsWith('…')).toBe(true)
    })

    it('no toca los textos que ya entran en el límite', () => {
      render(<GraveCard lapida={lapida({ epitafio: 'Se fue en paz' })} onAbrir={vi.fn()} />)

      expect(screen.getByText('Se fue en paz')).toBeTruthy()
    })
  })

  describe('estado resucitada (S5)', () => {
    it('no marca la tarjeta de una lápida que nunca revivió', () => {
      const { container } = render(
        <GraveCard lapida={lapida({ resucitada: false })} onAbrir={vi.fn()} />,
      )

      const tarjeta = container.querySelector('.lapida')!
      expect(tarjeta.className).not.toContain('lapida--resucitada')
    })

    it('reserva el hueco del rótulo aunque la lápida no haya revivido', () => {
      const { container } = render(
        <GraveCard lapida={lapida({ resucitada: false })} onAbrir={vi.fn()} />,
      )

      const contenido = container.querySelector('.lapida__contenido')!
      const rotulo = contenido.querySelector('.lapida__resucitada')!

      // El span existe siempre, oculto, para que el alto no cambie al revivir.
      expect(rotulo).toBeTruthy()
      expect(rotulo.getAttribute('aria-hidden')).toBe('true')
      expect(rotulo.textContent).toContain('RESUCITADA')
    })

    it('ubica el rótulo arriba del nombre', () => {
      const { container } = render(
        <GraveCard lapida={lapida({ resucitada: false })} onAbrir={vi.fn()} />,
      )

      const contenido = container.querySelector('.lapida__contenido')!
      const rotulo = contenido.firstElementChild!

      expect(rotulo.className).toBe('lapida__resucitada')
      expect(rotulo.nextElementSibling?.className).toBe('lapida__nombre')
    })

    it('marca la tarjeta con una clase propia y muestra el rótulo cuando revivió', () => {
      const { container } = render(
        <GraveCard lapida={lapida({ resucitada: true })} onAbrir={vi.fn()} />,
      )

      const tarjeta = container.querySelector('.lapida')!
      expect(tarjeta.className).toContain('lapida--resucitada')

      const rotulo = container.querySelector('.lapida__resucitada')!
      expect(rotulo.getAttribute('aria-hidden')).toBeNull()
      expect(rotulo.textContent).toContain('RESUCITADA')
    })

    it('también reserva y muestra el rótulo en la variante baja, que es la del perfil', () => {
      const { container } = render(
        <GraveCard lapida={lapida({ resucitada: true })} tamano="baja" onAbrir={vi.fn()} />,
      )

      expect(container.querySelector('.lapida--resucitada')).toBeTruthy()

      const rotulo = container.querySelector('.lapida__contenido .lapida__resucitada')!
      expect(rotulo.getAttribute('aria-hidden')).toBeNull()
      expect(rotulo.textContent).toContain('RESUCITADA')
    })
  })
})
