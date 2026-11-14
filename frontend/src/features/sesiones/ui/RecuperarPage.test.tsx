import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../shared/api/client'
import { RecuperarPage } from './RecuperarPage'

const MENSAJE_EXITO = 'Tu contraseña se actualizó. Iniciá sesión con la nueva.'

function completar(
  container: HTMLElement,
  valores: { usuario?: string; codigo?: string; password?: string; confirmar?: string },
) {
  fireEvent.change(container.querySelector('#recuperar-usuario')!, {
    target: { value: valores.usuario ?? '  pepe  ' },
  })
  fireEvent.change(container.querySelector('#recuperar-codigo')!, {
    target: { value: valores.codigo ?? 'ABCD-EFGH-IJKL-MNOP' },
  })
  fireEvent.change(container.querySelector('#recuperar-password')!, {
    target: { value: valores.password ?? 'clave-nueva-1' },
  })
  fireEvent.change(container.querySelector('#recuperar-confirmar')!, {
    target: { value: valores.confirmar ?? 'clave-nueva-1' },
  })
}

describe('RecuperarPage', () => {
  it('envía usuario recortado, código y contraseña nueva al recuperar', async () => {
    const onRecuperar = vi.fn().mockResolvedValue(MENSAJE_EXITO)
    const { container } = render(
      <RecuperarPage onRecuperar={onRecuperar} onNavegar={vi.fn()} />,
    )

    completar(container, {})
    fireEvent.click(screen.getByRole('button', { name: 'CAMBIAR CONTRASEÑA' }))

    expect(onRecuperar).toHaveBeenCalledTimes(1)
    expect(onRecuperar).toHaveBeenCalledWith({
      username: 'pepe',
      codigo: 'ABCD-EFGH-IJKL-MNOP',
      password: 'clave-nueva-1',
    })
  })

  it('valida en cliente antes de llamar y no manda datos incompletos', () => {
    const onRecuperar = vi.fn()
    const { container } = render(
      <RecuperarPage onRecuperar={onRecuperar} onNavegar={vi.fn()} />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'CAMBIAR CONTRASEÑA' }))

    expect(onRecuperar).not.toHaveBeenCalled()
    expect(screen.getByText('El nombre de usuario es obligatorio.')).toBeTruthy()
    expect(screen.getByText('El código de recuperación es obligatorio.')).toBeTruthy()
    expect(screen.getByText('La contraseña debe tener al menos 8 caracteres.')).toBeTruthy()

    completar(container, { password: 'clave-nueva-1', confirmar: 'otra-clave-1' })
    fireEvent.click(screen.getByRole('button', { name: 'CAMBIAR CONTRASEÑA' }))

    expect(onRecuperar).not.toHaveBeenCalled()
    expect(screen.getByText('Las contraseñas no coinciden.')).toBeTruthy()
  })

  it('muestra el aviso de éxito y deja el volver al login sin el formulario', async () => {
    const onNavegar = vi.fn()
    const { container } = render(
      <RecuperarPage
        onRecuperar={vi.fn().mockResolvedValue(MENSAJE_EXITO)}
        onNavegar={onNavegar}
      />,
    )

    completar(container, {})
    fireEvent.click(screen.getByRole('button', { name: 'CAMBIAR CONTRASEÑA' }))

    expect(await screen.findByText(MENSAJE_EXITO)).toBeTruthy()
    // El formulario ya no está: reenviarlo solo daría el error de código usado.
    expect(container.querySelector('.auth__form')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'VOLVER A INICIAR SESIÓN' }))
    expect(onNavegar).toHaveBeenCalledWith('login')
  })

  it('muestra el mensaje del backend cuando el código no coincide y deja reintentar', async () => {
    const onRecuperar = vi
      .fn()
      .mockRejectedValue(new ApiError(400, 'invalido', 'El usuario y el código no coinciden.'))
    const { container } = render(
      <RecuperarPage onRecuperar={onRecuperar} onNavegar={vi.fn()} />,
    )

    completar(container, {})
    fireEvent.click(screen.getByRole('button', { name: 'CAMBIAR CONTRASEÑA' }))

    expect(await screen.findByText('El usuario y el código no coinciden.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'CAMBIAR CONTRASEÑA' })).toBeTruthy()
  })

  it('usa un mensaje propio cuando el fallo no es de la API', async () => {
    const { container } = render(
      <RecuperarPage
        onRecuperar={vi.fn().mockRejectedValue(new Error('boom'))}
        onNavegar={vi.fn()}
      />,
    )

    completar(container, {})
    fireEvent.click(screen.getByRole('button', { name: 'CAMBIAR CONTRASEÑA' }))

    expect(await screen.findByText('No se pudo recuperar la contraseña.')).toBeTruthy()
  })
})
