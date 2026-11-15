import { fireEvent, render, screen } from '@testing-library/react'
import { useState, type ComponentProps } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Session } from '../../sesiones/model/sesion'
import { PerfilesPage } from './PerfilesPage'

vi.mock('../../lapidas/ui/GraveCard', () => ({
  GraveCard: ({
    lapida,
    onCorona,
    propia,
  }: {
    lapida: { id: number; nombrePlanta: string }
    onCorona?: (lapida: { id: number; nombrePlanta: string }) => void
    propia?: boolean
  }) => (
    <article data-testid={`lapida-${lapida.id}`}>
      {lapida.nombrePlanta}
      {onCorona && (
        <button disabled={propia} onClick={() => onCorona(lapida)}>
          Dar corona
        </button>
      )}
    </article>
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
    onCorona: vi.fn().mockResolvedValue(undefined),
    onIrAMiPerfil: vi.fn(),
  }
}

type BaseProps = Omit<ComponentProps<typeof PerfilesPage>, 'username' | 'onNavegar'>

/**
 * La pantalla es dueña de la URL en la app real; acá el arnés hace de router
 * para que el clic en una tarjeta cambie el `username` como lo haría App.
 */
function Perfiles({ inicial = null, ...props }: BaseProps & { inicial?: string | null }) {
  const [username, setUsername] = useState<string | null>(inicial)

  return (
    <PerfilesPage
      {...props}
      username={username}
      onNavegar={(destino) =>
        setUsername(destino === '/perfiles' ? null : destino.replace('/perfiles/', ''))
      }
    />
  )
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
    render(<Perfiles {...baseProps(sesion())} />)

    fireEvent.click(await screen.findByText('@jardinero'))
    fireEvent.click(screen.getByRole('button', { name: 'EMITIR CÓDIGO DE RECUPERACIÓN' }))

    // El admin no conoce la contraseña del otro: la emisión va sin ella.
    expect(usuariosApi.emitirCodigoRecuperacion).toHaveBeenCalledWith('u1')
    expect(await screen.findByText('ABCD-EFGH-IJKL-MNOP')).toBeTruthy()
    expect(screen.getByText(/reemplaza al anterior/i)).toBeTruthy()
  })

  it('un usuario común no ve el botón en el perfil ajeno', async () => {
    render(
      <Perfiles {...baseProps(sesion({ id: 'otro-1', username: 'otro', rol: 'usuario' }))} />,
    )

    fireEvent.click(await screen.findByText('@jardinero'))

    expect(screen.queryByRole('button', { name: 'EMITIR CÓDIGO DE RECUPERACIÓN' })).toBeNull()
    expect(usuariosApi.emitirCodigoRecuperacion).not.toHaveBeenCalled()
  })

  it('no ofrece emitir en el perfil propio: ahí se hace con contraseña', async () => {
    vi.mocked(usuariosApi.listar).mockResolvedValue([
      { id: 'admin-1', username: 'admin', rol: 'admin', insignias: [], descripcion: '' },
    ])
    render(<Perfiles {...baseProps(sesion())} />)

    fireEvent.click(await screen.findByText('@admin'))

    expect(screen.queryByRole('button', { name: 'EMITIR CÓDIGO DE RECUPERACIÓN' })).toBeNull()
  })
})

describe('PerfilesPage — perfil pedido por la URL', () => {
  it('abre directo el perfil del username de la ruta', async () => {
    render(<Perfiles {...baseProps(sesion())} inicial="jardinero" />)

    // Antes de que llegue la lista se ve la carga, no "ya no está disponible".
    expect(screen.getByText('Cargando el perfil…')).toBeTruthy()
    expect(await screen.findByRole('heading', { name: 'jardinero' })).toBeTruthy()
  })

  it('avisa cuando el username ya no existe, en vez de mostrar la lista', async () => {
    render(<Perfiles {...baseProps(sesion())} inicial="fantasma" />)

    expect(await screen.findByText('Ese perfil ya no está disponible.')).toBeTruthy()
    expect(screen.queryByText('PERFILES')).toBeNull()
  })

  it('las tarjetas de la lista son links con la URL del perfil', async () => {
    render(<Perfiles {...baseProps(sesion())} />)

    const tarjeta = (await screen.findByText('@jardinero')).closest('a')!
    expect(tarjeta.getAttribute('href')).toBe('/perfiles/jardinero')
  })

  it('permite coronar una lápida desde el perfil ajeno usando la sesión real', async () => {
    const onCorona = vi.fn().mockResolvedValue(undefined)
    const tumba = {
      id: 8,
      nombrePlanta: 'Aloe',
      epitafio: 'Se fue',
      fechaFallecimiento: '2025-01-01',
      fechaPublicacion: '2025-01-02',
      autor: 'jardinero',
      categoriaId: 1,
      causaMuerte: '',
      fotoUrl: '',
      coronasCount: 0,
      usuarioId: 'u1',
    }

    render(
      <Perfiles
        {...baseProps(sesion({ id: 'admin-1', username: 'admin', rol: 'admin' }))}
        lapidas={[tumba]}
        onCorona={onCorona}
        inicial="jardinero"
      />,
    )

    fireEvent.click(await screen.findByRole('button', { name: /dar corona/i }))

    expect(onCorona).toHaveBeenCalledWith(tumba)
  })
})
