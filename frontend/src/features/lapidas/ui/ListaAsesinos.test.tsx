import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ListaAsesinos } from './ListaAsesinos'

describe('ListaAsesinos', () => {
  const ranking = [
    { username: 'jardinera', muertes: 4 },
    { username: 'admin', muertes: 1 },
  ]

  it('muestra el ranking que viene del backend, en su orden', () => {
    const { container } = render(<ListaAsesinos asesinos={ranking} variante="fila" />)

    const puestos = [...container.querySelectorAll('.ranking__puesto')].map((n) => n.textContent)
    expect(puestos).toEqual(['1. @jardinera', '2. @admin'])
  })

  it('concuerda el singular y el plural de la etiqueta', () => {
    render(<ListaAsesinos asesinos={ranking} variante="fila" />)

    expect(screen.getByText(/^plantas en el cementerio$/)).toBeTruthy()
    expect(screen.getByText(/^planta en el cementerio$/)).toBeTruthy()
  })

  it('marca la fila propia cuando se pide resaltar', () => {
    const { container } = render(
      <ListaAsesinos asesinos={ranking} variante="fila" resaltar="admin" />,
    )

    const filas = [...container.querySelectorAll('.ranking__fila')]
    expect(filas[0]!.getAttribute('data-propio')).toBeNull()
    expect(filas[1]!.getAttribute('data-propio')).toBe('true')
  })

  it('avisa cuando todavía no hay muertes en vez de mostrar una lista vacía', () => {
    render(<ListaAsesinos asesinos={[]} variante="sidebar" />)

    expect(screen.getByText('Todavía no hay plantas asesinadas que rankear.')).toBeTruthy()
  })

  it('en la barra lateral usa los puestos de la barra', () => {
    const { container } = render(<ListaAsesinos asesinos={ranking} variante="sidebar" />)

    expect(container.querySelectorAll('.sidebar__fila')).toHaveLength(2)
    expect(container.querySelectorAll('.ranking__fila')).toHaveLength(0)
  })
})
