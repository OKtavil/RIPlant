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
    fireEvent.change(container.querySelector('#login-password')!, { target: { value: 'clave-de-prueba' } })
    fireEvent.click(screen.getByRole('button', { name: 'ENTRAR' }))

    expect(onIngresar).toHaveBeenCalledTimes(1)
    expect(onIngresar).toHaveBeenCalledWith({ username: 'admin', password: 'clave-de-prueba' })
    expect(onNavegar).not.toHaveBeenCalled()
  })

  it('explica qué es R.I.Planta y cómo empezar a quien entra por primera vez (J001)', () => {
    const { container } = render(<LoginPage onIngresar={vi.fn()} onNavegar={vi.fn()} />)

    // El prototipo no trae explicación: es copy nuevo para quien llega sin
    // contexto. Va antes del formulario, no después, porque explica qué está
    // por hacer antes de pedir las credenciales.
    const contexto = container.querySelector('.auth__contexto')
    expect(contexto).toBeTruthy()

    const texto = contexto!.textContent ?? ''
    expect(texto).toMatch(/cementerio de plantas/i)
    expect(texto).toMatch(/lápida/i)
    expect(texto).toMatch(/corona/i)
    expect(texto).toMatch(/cuenta/i)

    const tarjeta = container.querySelector('.auth__tarjeta')!
    const hijos = [...tarjeta.children]
    expect(hijos.indexOf(contexto as Element)).toBeLessThan(hijos.indexOf(container.querySelector('.auth__form')!))
  })

  it('no muestra el link de recuperación de contraseña', () => {
    render(<LoginPage onIngresar={vi.fn()} onNavegar={vi.fn()} />)

    expect(screen.queryByText(/OLVIDASTE TU CONTRASEÑA/)).toBeNull()
  })

  it('no muestra la ayuda del prototipo sobre el rótulo del correo', () => {
    render(<LoginPage onIngresar={vi.fn()} onNavegar={vi.fn()} />)

    expect(screen.queryByText(/CORREO ELECTRÓNICO/)).toBeNull()
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
