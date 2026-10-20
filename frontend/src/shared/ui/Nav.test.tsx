import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Nav } from './Nav'

describe('Nav', () => {
  it('muestra el logo sin fondo propio', () => {
    const { container } = render(<Nav items={['inicio']} />)

    const logo = container.querySelector('.nav__logo')!
    expect(logo.textContent).toBe('R.I.PLANTA')
  })

  it('renderiza las acciones dentro del nav, no fuera', () => {
    const { container } = render(
      <Nav
        items={['inicio', 'publicar']}
        acciones={<button className="nav__item">INICIAR SESIÓN</button>}
      />,
    )

    const nav = container.querySelector('.nav')!
    // La acción tiene que colgar del nav, no de un contenedor hermano.
    const acciones = nav.querySelector('.nav__acciones')!
    expect(acciones.querySelector('.nav__item')!.textContent).toBe('INICIAR SESIÓN')
    expect(container.querySelector('.pantalla__acciones')).toBeNull()
    expect(screen.getByRole('button', { name: 'INICIAR SESIÓN' })).toBeTruthy()
  })

  it('deja el logo y los ítems aunque no haya acciones', () => {
    const { container } = render(<Nav items={['inicio']} onNavegar={vi.fn()} />)

    const nav = container.querySelector('.nav')!
    expect(nav.querySelector('.nav__logo')).toBeTruthy()
    expect(nav.querySelectorAll('.nav__item').length).toBe(1)
  })

  it('mantiene el logo primero y las acciones al final del nav', () => {
    const { container } = render(
      <Nav
        items={['inicio', 'ranking', 'publicar']}
        acciones={<button className="nav__item">INICIAR SESIÓN</button>}
      />,
    )

    const nav = container.querySelector('.nav')!
    const hijos = Array.from(nav.children).map((h) => h.className)
    expect(hijos).toEqual(['nav__logo', 'nav__items', 'nav__acciones'])
  })
})
