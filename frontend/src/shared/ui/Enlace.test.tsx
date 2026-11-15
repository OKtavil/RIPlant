import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Enlace } from './Enlace'

describe('Enlace', () => {
  it('conserva la URL real en el href', () => {
    render(
      <Enlace href="/lapidas/7" onNavegar={vi.fn()}>
        Lápida
      </Enlace>,
    )

    expect(screen.getByRole('link', { name: 'Lápida' }).getAttribute('href')).toBe('/lapidas/7')
  })

  it('el clic simple navega por el router interno y no deja que el navegador recargue', () => {
    const onNavegar = vi.fn()
    render(
      <Enlace href="/perfiles/zombie" onNavegar={onNavegar}>
        Perfil
      </Enlace>,
    )

    // `fireEvent.click` devuelve `false` cuando el manejador llamó a
    // `preventDefault`: es la señal de que no hay navegación completa.
    const noCancelado = fireEvent.click(screen.getByRole('link', { name: 'Perfil' }))

    expect(onNavegar).toHaveBeenCalledWith('/perfiles/zombie')
    expect(noCancelado).toBe(false)
  })

  it('deja el clic con modificadores al navegador, para abrir en otra pestaña', () => {
    const onNavegar = vi.fn()
    render(
      <Enlace href="/perfiles/zombie" onNavegar={onNavegar}>
        Perfil
      </Enlace>,
    )

    fireEvent.click(screen.getByRole('link', { name: 'Perfil' }), { ctrlKey: true })

    expect(onNavegar).not.toHaveBeenCalled()
  })
})
