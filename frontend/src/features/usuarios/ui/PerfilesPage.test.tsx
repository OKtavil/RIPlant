import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Session } from '../../sesiones/model/sesion'
import { PerfilesPage } from './PerfilesPage'

vi.mock('../../lapidas/ui/GraveCard', () => ({
  GraveCard: ({ lapida }: { lapida: { id: number; nombrePlanta: string } }) => (
    <article data-testid={`lapida-${lapida.id}`}>{lapida.nombrePlanta}</article>
  ),
  GraveCardNueva: ({ texto }: { texto: string }) => <button>{texto}</button>,
}))

vi.mock('../api/usuarios.api', () => ({
  usuariosApi: {
    listar: vi.fn(),
    emitirCodigoRecuperacion: vi.fn(),
  },
}))

const { usuariosApi } = await import('../api/usuarios.api')

function sesion(parcial: Partial<Session> = {}): Session {
  return {
    id: 'admin-1',
    username: 'admin',
    rol: 'admin',
    insignias: [],
    expiraEn: '2026-12-31T00:00:00.000Z',
    ...parcial,
  }
}

function baseProps(actual: Session) {
  return {
    sesion: actual,
    lapidas: [],
    categorias: [],
    asesinos: [],
    onAbrir: vi.fn(),
    onPublicar: vi.fn(),
    onBorrar: vi.fn().mockResolvedValue(undefined),
    onIrAMiPerfil: vi.fn(),
  }
}

beforeEach(() => {
  vi.mocked(usuariosApi.listar).mockResolvedValue([
    { id: 'u1', username: 'jardinero', rol: 'usuario', insignias: [], descripcion: '' },
  ])
  vi.mocked(usuariosApi.emitirCodigoRecuperacion).mockResolvedValue({
    codigoRecuperacion: 'ABCD-EFGH-IJKL-MNOP',
  })
})

describe('PerfilesPage — emisión de código de recuperación', () => {
  it('el admin emite un código para otro usuario y lo muestra una sola vez', async () => {
    render(<PerfilesPage {...baseProps(sesion())} />)

    fireEvent.click(await screen.findByText('@jardinero'))
    fireEvent.click(screen.getByRole('button', { name: 'EMITIR CÓDIGO DE RECUPERACIÓN' }))

    // El admin no conoce la contraseña del otro: la emisión va sin ella.
    expect(usuariosApi.emitirCodigoRecuperacion).toHaveBeenCalledWith('u1')
    expect(await screen.findByText('ABCD-EFGH-IJKL-MNOP')).toBeTruthy()
    expect(screen.getByText(/reemplaza al anterior/i)).toBeTruthy()
  })

  it('un usuario común no ve el botón en el perfil ajeno', async () => {
    render(
      <PerfilesPage
        {...baseProps(sesion({ id: 'otro-1', username: 'otro', rol: 'usuario' }))}
      />,
    )

    fireEvent.click(await screen.findByText('@jardinero'))

    expect(screen.queryByRole('button', { name: 'EMITIR CÓDIGO DE RECUPERACIÓN' })).toBeNull()
    expect(usuariosApi.emitirCodigoRecuperacion).not.toHaveBeenCalled()
  })

  it('no ofrece emitir en el perfil propio: ahí se hace con contraseña', async () => {
    vi.mocked(usuariosApi.listar).mockResolvedValue([
      { id: 'admin-1', username: 'admin', rol: 'admin', insignias: [], descripcion: '' },
    ])
    render(<PerfilesPage {...baseProps(sesion())} />)

    fireEvent.click(await screen.findByText('@admin'))

    expect(screen.queryByRole('button', { name: 'EMITIR CÓDIGO DE RECUPERACIÓN' })).toBeNull()
  })
})
