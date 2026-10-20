import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../shared/api/client'
import { LoginPage } from './LoginPage'

describe('LoginPage', () => {
  it('envía las credenciales con el usuario recortado', () => {
    const onIngresar = vi.fn().mockResolvedValue(undefined)
    const onNavegar = vi.fn()
    const { container } = render(<LoginPage onIngresar={onIngresar} onNavegar={onNavegar} />)

    fireEvent.change(container.querySelector('#login-identidad')!, { target: { value: '  admin  ' } })
    fireEvent.change(container.querySelector('#login-password')!, { target: { value: 'riplanta123' } })
    fireEvent.click(screen.getByRole('button', { name: 'ENTRAR' }))

    expect(onIngresar).toHaveBeenCalledTimes(1)
    expect(onIngresar).toHaveBeenCalledWith({ username: 'admin', password: 'riplanta123' })
    expect(onNavegar).not.toHaveBeenCalled()
  })

  it('muestra el mensaje del ApiError cuando el login falla y vuelve a habilitar el botón', async () => {
    const onIngresar = vi
      .fn()
      .mockRejectedValue(new ApiError(401, 'no-autorizado', 'Necesitás iniciar sesión.'))
    const { container } = render(<LoginPage onIngresar={onIngresar} onNavegar={vi.fn()} />)

    fireEvent.change(container.querySelector('#login-identidad')!, { target: { value: 'admin' } })
    fireEvent.change(container.querySelector('#login-password')!, { target: { value: 'mala' } })
    fireEvent.click(screen.getByRole('button', { name: 'ENTRAR' }))

    expect(await screen.findByText('Necesitás iniciar sesión.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'ENTRAR' })).toBeTruthy()
  })
})
