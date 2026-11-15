import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../shared/api/client'
import type { Grave } from '../model/lapida'
import { PerfilPage } from './PerfilPage'

vi.mock('./GraveCard', () => ({
  GraveCard: ({ lapida }: { lapida: { id: number; nombrePlanta: string } }) => (
    <article data-testid={`lapida-${lapida.id}`}>{lapida.nombrePlanta}</article>
  ),
  GraveCardNueva: ({ texto }: { texto: string }) => <button>{texto}</button>,
}))

function baseProps() {
  return {
    sesion: {
      id: 'u1',
      username: 'jardinero',
      rol: 'usuario' as const,
      insignias: [],
      expiraEn: '2026-12-31T00:00:00.000Z',
    },
    lapidas: [],
    categorias: [],
    asesinos: [],
    onAbrir: vi.fn(),
    onPublicar: vi.fn(),
    onBorrar: vi.fn().mockResolvedValue(undefined),
    onIniciarSesion: vi.fn(),
  }
}

describe('PerfilPage (S4)', () => {
  const base = baseProps()

  it('permite editar el perfil y solo pide la contraseña actual al cambiarla', async () => {
    const onActualizarPerfil = vi.fn().mockResolvedValue(undefined)
    render(<PerfilPage {...base} onActualizarPerfil={onActualizarPerfil} />)

    expect(screen.queryByRole('button', { name: /editar descripción/i })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'EDITAR PERFIL' }))
    expect(document.querySelector('form.perfil__editor.publicar__tarjeta')).toBeTruthy()
    expect(screen.getByText('0/280 caracteres')).toBeTruthy()
    expect(screen.queryByLabelText('Contraseña actual')).toBeNull()

    fireEvent.change(screen.getByLabelText(/Descripción \(opcional\)/), {
      target: { value: 'Un perfil actualizado' },
    })
    fireEvent.change(screen.getByLabelText(/Nueva contraseña \(opcional\)/), {
      target: { value: 'clave-nueva-1' },
    })
    expect(screen.getByLabelText('Contraseña actual').hasAttribute('required')).toBe(true)
    fireEvent.change(screen.getByLabelText('Contraseña actual'), {
      target: { value: 'clave-actual-1' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'GUARDAR PERFIL' }))

    await waitFor(() => {
      expect(onActualizarPerfil).toHaveBeenCalledWith({
        descripcion: 'Un perfil actualizado',
        passwordActual: 'clave-actual-1',
        passwordNueva: 'clave-nueva-1',
      })
    })
  })

  it('muestra la imagen actual y, al elegir otra, la vista previa al lado', () => {
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:nueva-imagen'),
      revokeObjectURL: vi.fn(),
    })
    const { container } = render(
      <PerfilPage
        {...base}
        sesion={{ ...base.sesion, avatarUrl: '/uploads/actual.png' }}
        onActualizarPerfil={vi.fn().mockResolvedValue(undefined)}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'EDITAR PERFIL' }))

    const imagenes = container.querySelector('.perfil__editor-imagenes')!
    expect(imagenes.querySelectorAll('figure')).toHaveLength(1)
    expect(screen.getByRole('img', { name: 'Imagen actual del perfil' }).getAttribute('src')).toBe(
      '/uploads/actual.png',
    )

    fireEvent.change(container.querySelector('#perfil-foto')!, {
      target: { files: [new File(['imagen'], 'nueva.png', { type: 'image/png' })] },
    })

    expect(imagenes.querySelectorAll('figure')).toHaveLength(2)
    expect(imagenes.querySelector('figure:first-child')?.textContent).toContain('IMAGEN ACTUAL')
    expect(imagenes.querySelector('figure:last-child')?.textContent).toContain('VISTA PREVIA')
    expect(
      screen.getByRole('img', { name: 'Vista previa de la nueva imagen de perfil' }).getAttribute('src'),
    ).toBe('blob:nueva-imagen')
  })

  it('muestra el aviso de cómo se obtiene la insignia si el usuario no la tiene', () => {
    render(<PerfilPage {...base} />)

    expect(screen.getByText(/editá una de tus lápidas/i)).toBeTruthy()
    // Ya no usa el slot "no disponible" para este caso: la insignia es real.
    expect(screen.queryByText(/todavía no tiene estado en la API/i)).toBeNull()
  })

  it('no muestra la tarjeta para publicar en el cementerio del perfil', () => {
    const { container } = render(<PerfilPage {...base} />)

    expect(container.querySelector('.lapida--nueva')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Nueva lápida' })).toBeNull()
  })

  it('marca la insignia como obtenida con la fecha cuando la tiene en la sesión', () => {
    const { container } = render(
      <PerfilPage
        {...base}
        sesion={{
          id: 'u1',
          username: 'jardinero',
          rol: 'usuario',
          insignias: [
            {
              codigo: 'superviviente-zombie',
              lapidaId: 7,
              obtenidaEn: '2026-10-20T00:00:00.000Z',
            },
          ],
          expiraEn: '2026-12-31T00:00:00.000Z',
        }}
      />,
    )

    expect(container.querySelector('.perfil__stat--insignia')).toBeTruthy()
    expect(container.querySelector('.perfil__stat--insignia')!.className).toContain(
      'perfil__stat--obtenida',
    )
    expect(screen.getByText(/obtenida/i)).toBeTruthy()
  })

  it('no inventa insignias ajenas: si el dueño no la tiene, el slot aparece apagado', () => {
    render(<PerfilPage {...base} />)

    const stat = document.querySelector('.perfil__stat--insignia')!
    expect(stat.className).not.toContain('perfil__stat--obtenida')
  })

  it('no ofrece el código de recuperación en el perfil ajeno ni sin handler', () => {
    const { container } = render(<PerfilPage {...base} />)
    expect(container.querySelector('#perfil-password-codigo')).toBeNull()
    expect(screen.queryByText('CÓDIGO DE RECUPERACIÓN')).toBeNull()

    const ajeno = render(
      <PerfilPage
        {...base}
        soloLectura
        onEmitirCodigoRecuperacion={vi.fn()}
      />,
    )
    expect(ajeno.container.querySelector('#perfil-password-codigo')).toBeNull()
  })

  it('genera un código nuevo desde el perfil propio con la contraseña actual', async () => {
    const onEmitirCodigoRecuperacion = vi.fn().mockResolvedValue('ABCD-EFGH-IJKL-MNOP')
    const { container } = render(
      <PerfilPage {...base} onEmitirCodigoRecuperacion={onEmitirCodigoRecuperacion} />,
    )

    // La contraseña no está para molestar: sin ella, una sesión robada podría
    // rotar el código y quedarse con la cuenta.
    expect(container.querySelector('#perfil-password-codigo')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'GENERAR CÓDIGO NUEVO' }))

    fireEvent.change(container.querySelector('#perfil-password-codigo')!, {
      target: { value: 'clave-actual-1' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'CONFIRMAR Y GENERAR' }))

    expect(await screen.findByText('ABCD-EFGH-IJKL-MNOP')).toBeTruthy()
    expect(onEmitirCodigoRecuperacion).toHaveBeenCalledWith('clave-actual-1')
    // El código reemplaza al anterior: hay que avisarlo, no solo mostrarlo.
    expect(screen.getByText(/reemplaza al anterior/i)).toBeTruthy()
  })

  it('muestra el error del backend si la contraseña actual no es correcta', async () => {
    const onEmitirCodigoRecuperacion = vi
      .fn()
      .mockRejectedValue(new ApiError(403, 'prohibido', 'La contraseña actual no es correcta'))
    const { container } = render(
      <PerfilPage {...base} onEmitirCodigoRecuperacion={onEmitirCodigoRecuperacion} />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'GENERAR CÓDIGO NUEVO' }))
    fireEvent.change(container.querySelector('#perfil-password-codigo')!, {
      target: { value: 'mala' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'CONFIRMAR Y GENERAR' }))

    expect(await screen.findByText('La contraseña actual no es correcta')).toBeTruthy()
  })

  it('lista una lápida propia recién publicada, aunque el POST no traiga `duenio`', () => {
    // `POST /lapidas` devuelve el documento crudo; `duenio` solo lo agrega
    // `GET /lapidas`. Filtrar por `duenio.username` escondía la lápida recién
    // publicada del perfil de su dueño hasta recargar (J003).
    const recienPublicada: Grave = {
      id: 42,
      nombrePlanta: 'Aloe',
      epitafio: 'Se fue',
      fechaFallecimiento: '2025-01-01',
      fechaPublicacion: '2025-01-02',
      autor: 'jardinero',
      categoriaId: 1,
      causaMuerte: 'Poca luz',
      fotoUrl: '',
      coronasCount: 0,
      usuarioId: 'u1',
    }

    render(<PerfilPage {...base} lapidas={[recienPublicada]} />)

    expect(screen.getByTestId('lapida-42')).toBeTruthy()
  })
})
