import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
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

  it('muestra el aviso de cómo se obtiene la insignia si el usuario no la tiene', () => {
    render(<PerfilPage {...base} />)

    expect(screen.getByText(/editá una de tus lápidas/i)).toBeTruthy()
    // Ya no usa el slot "no disponible" para este caso: la insignia es real.
    expect(screen.queryByText(/todavía no tiene estado en la API/i)).toBeNull()
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
})
