import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../shared/api/client'
import { RegistroPage } from './RegistroPage'

function completar(container: HTMLElement, password: string, confirmar: string) {
  fireEvent.change(container.querySelector('#registro-usuario')!, { target: { value: '  pepe  ' } })
  fireEvent.change(container.querySelector('#registro-password')!, { target: { value: password } })
  fireEvent.change(container.querySelector('#registro-confirmar')!, { target: { value: confirmar } })
}

describe('RegistroPage', () => {
  it('registra con el usuario recortado cuando las contraseñas coinciden', () => {
    const onRegistrar = vi.fn().mockResolvedValue('ABCD-EFGH-IJKL-MNOP')
    const { container } = render(
      <RegistroPage onRegistrar={onRegistrar} onContinuar={vi.fn()} onNavegar={vi.fn()} />,
    )

    completar(container, 'clave-de-prueba', 'clave-de-prueba')
    fireEvent.click(screen.getByRole('button', { name: 'CREAR CUENTA' }))

    expect(onRegistrar).toHaveBeenCalledTimes(1)
    expect(onRegistrar).toHaveBeenCalledWith({ username: 'pepe', password: 'clave-de-prueba' })
  })

  it('muestra el código una sola vez y espera confirmación antes de continuar', async () => {
    const onContinuar = vi.fn()
    const { container } = render(
      <RegistroPage
        onRegistrar={vi.fn().mockResolvedValue('ABCD-EFGH-IJKL-MNOP')}
        onContinuar={onContinuar}
        onNavegar={vi.fn()}
      />,
    )

    completar(container, 'clave-de-prueba', 'clave-de-prueba')
    fireEvent.click(screen.getByRole('button', { name: 'CREAR CUENTA' }))

    // El código es la única vía de recuperación sin email: si la pantalla
    // navegara sola, el usuario se lo perdería para siempre.
    expect(await screen.findByText('ABCD-EFGH-IJKL-MNOP')).toBeTruthy()
    expect(onContinuar).not.toHaveBeenCalled()
    expect(container.querySelector('.auth__form')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'ENTRAR AL CEMENTERIO' }))
    expect(onContinuar).toHaveBeenCalledTimes(1)
  })

  it('no llama a la API y avisa cuando las contraseñas no coinciden', () => {
    const onRegistrar = vi.fn()
    const { container } = render(<RegistroPage onRegistrar={onRegistrar} onContinuar={vi.fn()} onNavegar={vi.fn()} />)

    completar(container, 'clave-de-prueba', 'otra-cosa')
    fireEvent.click(screen.getByRole('button', { name: 'CREAR CUENTA' }))

    expect(onRegistrar).not.toHaveBeenCalled()
    expect(screen.getByText('Las contraseñas no coinciden.')).toBeTruthy()
  })

  it('no llama a la API y avisa cuando la contraseña es corta', () => {
    const onRegistrar = vi.fn()
    const { container } = render(<RegistroPage onRegistrar={onRegistrar} onContinuar={vi.fn()} onNavegar={vi.fn()} />)

    completar(container, 'corta', 'corta')
    fireEvent.click(screen.getByRole('button', { name: 'CREAR CUENTA' }))

    expect(onRegistrar).not.toHaveBeenCalled()
    expect(screen.getByText('La contraseña necesita al menos 8 caracteres.')).toBeTruthy()
  })

  it('no llama a la API cuando la contraseña supera los 72 caracteres', () => {
    const onRegistrar = vi.fn()
    const { container } = render(<RegistroPage onRegistrar={onRegistrar} onContinuar={vi.fn()} onNavegar={vi.fn()} />)

    completar(container, 'x'.repeat(73), 'x'.repeat(73))
    fireEvent.click(screen.getByRole('button', { name: 'CREAR CUENTA' }))

    expect(onRegistrar).not.toHaveBeenCalled()
    expect(screen.getByText('La contraseña no puede superar los 72 caracteres.')).toBeTruthy()
  })

  it('no llama a la API cuando el usuario supera los 50 caracteres', () => {
    const onRegistrar = vi.fn()
    const { container } = render(<RegistroPage onRegistrar={onRegistrar} onContinuar={vi.fn()} onNavegar={vi.fn()} />)

    fireEvent.change(container.querySelector('#registro-usuario')!, {
      target: { value: 'x'.repeat(51) },
    })
    fireEvent.change(container.querySelector('#registro-password')!, {
      target: { value: 'clave-de-prueba' },
    })
    fireEvent.change(container.querySelector('#registro-confirmar')!, {
      target: { value: 'clave-de-prueba' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'CREAR CUENTA' }))

    expect(onRegistrar).not.toHaveBeenCalled()
    expect(screen.getByText('El nombre de usuario no puede superar los 50 caracteres.')).toBeTruthy()
  })

  it('muestra el mensaje del ApiError cuando el usuario ya existe y vuelve a habilitar el botón', async () => {
    const onRegistrar = vi
      .fn()
      .mockRejectedValue(new ApiError(409, 'conflicto', 'Ese nombre de usuario ya está en uso.'))
    const { container } = render(<RegistroPage onRegistrar={onRegistrar} onContinuar={vi.fn()} onNavegar={vi.fn()} />)

    completar(container, 'clave-de-prueba', 'clave-de-prueba')
    fireEvent.click(screen.getByRole('button', { name: 'CREAR CUENTA' }))

    expect(await screen.findByText('Ese nombre de usuario ya está en uso.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'CREAR CUENTA' })).toBeTruthy()
  })

  it('no renderiza el campo de correo', () => {
    const { container } = render(<RegistroPage onRegistrar={vi.fn()} onContinuar={vi.fn()} onNavegar={vi.fn()} />)

    expect(container.querySelector('#registro-correo')).toBeNull()
    expect(container.querySelector('#registro-usuario')).toHaveProperty('disabled', false)
  })
})
