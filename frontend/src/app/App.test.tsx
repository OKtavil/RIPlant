import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Grave } from '../features/lapidas/model/lapida'
import type { Session } from '../features/sesiones/model/sesion'
import App from './App'

/**
 * Tests de composición de la app: lo que solo se ve cuando las pantallas se
 * conectan con la sesión y la navegación. Las pantallas se prueban aparte; acá
 * importan los cruces que la incidencia reportó (E002, E004 y E006).
 */

vi.mock('../features/lapidas/api/lapidas.api', () => ({
  lapidasApi: {
    findAll: vi.fn(),
    asesinos: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    revivir: vi.fn(),
    giveCorona: vi.fn(),
    quitarCorona: vi.fn(),
    subirFoto: vi.fn(),
  },
}))

vi.mock('../features/categorias/api/categorias.api', () => ({
  categoriasApi: {
    findAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}))

vi.mock('../features/sesiones/api/sesiones.api', () => ({
  sesionesApi: {
    actual: vi.fn(),
    iniciar: vi.fn(),
    registrar: vi.fn(),
    recuperar: vi.fn(),
    cerrar: vi.fn(),
  },
}))

vi.mock('../features/usuarios/api/usuarios.api', () => ({
  usuariosApi: {
    actualizarPerfil: vi.fn(),
  },
}))

const { lapidasApi } = await import('../features/lapidas/api/lapidas.api')
const { categoriasApi } = await import('../features/categorias/api/categorias.api')
const { sesionesApi } = await import('../features/sesiones/api/sesiones.api')

function lapida(parcial: Partial<Grave> = {}): Grave {
  return {
    id: 1,
    nombrePlanta: 'Pepino',
    epitafio: 'Se fue',
    fechaFallecimiento: '2025-01-01',
    fechaPublicacion: '2025-01-02',
    autor: 'Anónimo',
    categoriaId: 1,
    causaMuerte: 'Poca luz',
    fotoUrl: '',
    coronasCount: 0,
    usuarioId: 'u1',
    duenio: { username: 'zombie', rol: 'usuario' },
    ...parcial,
  }
}

function sesion(parcial: Partial<Session> = {}): Session {
  return {
    id: 'u1',
    username: 'zombie',
    rol: 'usuario',
    insignias: [],
    expiraEn: '2026-10-20T00:00:00.000Z',
    ...parcial,
  }
}

/**
 * Promesa que el test resuelve cuando quiere. Sirve para mirar qué llamadas ya
 * salieron mientras las anteriores siguen pendientes: si el código encadena
 * `await`, la segunda llamada no existe todavía.
 */
function diferida<T>() {
  let resolver!: (valor: T) => void
  let rechazar!: (motivo: unknown) => void
  const promesa = new Promise<T>((res, rej) => {
    resolver = res
    rechazar = rej
  })
  return { promesa, resolver, rechazar }
}

beforeEach(() => {
  window.history.replaceState(null, '', '/')
  // `DetallePage` monta los comentarios, que salen a la red al montar.
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json([])))
  vi.mocked(lapidasApi.findAll).mockResolvedValue([])
  vi.mocked(lapidasApi.asesinos).mockResolvedValue([])
  vi.mocked(categoriasApi.findAll).mockResolvedValue([{ id: 1, nombre: 'Suculentas' }])
  vi.mocked(sesionesApi.actual).mockRejectedValue(new Error('sin sesión'))
  vi.mocked(sesionesApi.iniciar).mockResolvedValue(sesion())
  vi.mocked(sesionesApi.cerrar).mockResolvedValue(undefined)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('E002 — los errores se limpian al cambiar de pestaña', () => {
  it('el aviso de conexión desaparece cuando el usuario navega', async () => {
    vi.mocked(lapidasApi.findAll).mockRejectedValue(new Error('backend caído'))

    render(<App />)

    expect(await screen.findByText(/no se pudo conectar con el backend/i)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /ranking/i }))

    await waitFor(() =>
      expect(screen.queryByText(/no se pudo conectar con el backend/i)).toBeNull(),
    )
  })
})

describe('navegación de publicación', () => {
  it('muestra PUBLICAR en el nav también cuando no hay sesión', async () => {
    render(<App />)

    expect(await screen.findByRole('button', { name: /iniciar sesión/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /^publicar$/i })).toBeTruthy()
  })

  it('abre el login al tocar PUBLICAR sin sesión, en vez del formulario', async () => {
    render(<App />)

    fireEvent.click(await screen.findByRole('button', { name: /^publicar$/i }))

    expect(await screen.findByText(/vuelve a tu jardín/i)).toBeTruthy()
    expect(screen.queryByRole('heading', { name: /nueva lápida/i })).toBeNull()
  })

  it('muestra PUBLICAR en el nav con sesión iniciada', async () => {
    vi.mocked(sesionesApi.actual).mockResolvedValue(sesion())
    render(<App />)

    expect(await screen.findByRole('button', { name: /^publicar$/i })).toBeTruthy()
  })

  it('abre el formulario al tocar PUBLICAR con sesión iniciada', async () => {
    vi.mocked(sesionesApi.actual).mockResolvedValue(sesion())
    render(<App />)

    fireEvent.click(await screen.findByRole('button', { name: /^publicar$/i }))

    expect(await screen.findByRole('heading', { name: /nueva lápida/i })).toBeTruthy()
  })

  it('manda a login si se entra directo a /publicar sin sesión', async () => {
    window.history.replaceState(null, '', '/publicar')
    render(<App />)

    expect(await screen.findByText(/vuelve a tu jardín/i)).toBeTruthy()
    expect(screen.queryByRole('heading', { name: /nueva lápida/i })).toBeNull()

    // El logo es la única salida de las pantallas de auth: tiene que volver al
    // inicio, no reabrir el login sobre la ruta protegida.
    fireEvent.click(screen.getByRole('button', { name: /r\.i\.planta/i }))
    expect(await screen.findByRole('button', { name: /^publicar$/i })).toBeTruthy()
    expect(window.location.pathname).toBe('/')
  })

  it('deja el formulario si se entra directo a /publicar con sesión iniciada', async () => {
    window.history.replaceState(null, '', '/publicar')
    vi.mocked(sesionesApi.actual).mockResolvedValue(sesion())
    render(<App />)

    expect(await screen.findByRole('heading', { name: /nueva lápida/i })).toBeTruthy()
    expect(screen.queryByText(/vuelve a tu jardín/i)).toBeNull()
  })
})

describe('estado de corona al cerrar sesión', () => {
  it('quita el indicador de corona puesta al salir', async () => {
    vi.mocked(sesionesApi.actual).mockResolvedValue(
      sesion({ id: 'u2', username: 'visitante' }),
    )
    vi.mocked(lapidasApi.findAll).mockResolvedValue([
      lapida({
        usuarioId: 'u1',
        duenio: { username: 'zombie', rol: 'zombie' },
        coronasCount: 1,
        coronadaPorMi: true,
      }),
    ])

    render(<App />)

    const botonCorona = await screen.findByRole('button', {
      name: /quitar la corona de pepino/i,
    })
    expect(botonCorona.className).toContain('lapida__coronas--puesta')

    fireEvent.click(screen.getByRole('button', { name: /salir/i }))

    const botonSinSesion = await screen.findByRole('button', {
      name: /dar una corona a pepino/i,
    })
    expect(botonSinSesion.className).not.toContain('lapida__coronas--puesta')
  })
})

describe('estado de corona al cargar la página', () => {
  it('vuelve a cargar las lápidas después de resolver la sesión', async () => {
    vi.mocked(sesionesApi.actual).mockResolvedValue(
      sesion({ id: 'u2', username: 'visitante' }),
    )
    vi.mocked(lapidasApi.findAll)
      .mockResolvedValueOnce([
        lapida({
          usuarioId: 'u1',
          duenio: { username: 'jardinera', rol: 'usuario' },
          coronasCount: 1,
          coronadaPorMi: false,
        }),
      ])
      .mockResolvedValueOnce([
        lapida({
          usuarioId: 'u1',
          duenio: { username: 'jardinera', rol: 'usuario' },
          coronasCount: 1,
          coronadaPorMi: true,
        }),
      ])

    render(<App />)

    const botonCorona = await screen.findByRole('button', {
      name: /quitar la corona de pepino/i,
    })
    expect(botonCorona.className).toContain('lapida__coronas--puesta')
    expect(lapidasApi.findAll).toHaveBeenCalledTimes(2)
  })
})

describe('estado de corona al iniciar sesión', () => {
  it('recarga las lápidas para mostrar las coronas de la sesión recién iniciada', async () => {
    vi.mocked(lapidasApi.findAll)
      .mockResolvedValueOnce([
        lapida({
          usuarioId: 'u2',
          duenio: { username: 'jardinera', rol: 'usuario' },
          coronasCount: 1,
          coronadaPorMi: false,
        }),
      ])
      .mockResolvedValueOnce([
        lapida({
          usuarioId: 'u2',
          duenio: { username: 'jardinera', rol: 'usuario' },
          coronasCount: 1,
          coronadaPorMi: true,
        }),
      ])
    vi.mocked(sesionesApi.iniciar).mockResolvedValue(
      sesion({ id: 'u2', username: 'visitante' }),
    )

    render(<App />)

    fireEvent.click(await screen.findByRole('button', { name: /iniciar sesión/i }))
    fireEvent.change(screen.getByLabelText(/nombre de usuario/i), {
      target: { value: 'visitante' },
    })
    fireEvent.change(screen.getByLabelText(/contraseña/i), {
      target: { value: 'secreta123' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^entrar$/i }))

    const botonCorona = await screen.findByRole('button', {
      name: /quitar la corona de pepino/i,
    })
    expect(botonCorona.className).toContain('lapida__coronas--puesta')
    expect(lapidasApi.findAll).toHaveBeenCalledTimes(2)
  })
})

describe('E004 — borrar una lápida pide confirmación', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/lapidas/1')
    vi.mocked(lapidasApi.findAll).mockResolvedValue([lapida()])
    vi.mocked(sesionesApi.actual).mockResolvedValue(sesion())
    vi.mocked(lapidasApi.remove).mockResolvedValue(undefined)
  })

  it('no borra hasta que el usuario confirma en el modal', async () => {
    render(<App />)

    fireEvent.click(await screen.findByRole('button', { name: /borrar la lápida de pepino/i }))

    expect(await screen.findByRole('dialog')).toBeTruthy()
    expect(lapidasApi.remove).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: /^borrar$/i }))

    await waitFor(() => expect(lapidasApi.remove).toHaveBeenCalledWith(1))
  })

  it('cancelar cierra el modal sin borrar', async () => {
    render(<App />)

    fireEvent.click(await screen.findByRole('button', { name: /borrar la lápida de pepino/i }))
    fireEvent.click(await screen.findByRole('button', { name: /cancelar/i }))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(lapidasApi.remove).not.toHaveBeenCalled()
  })

  it('si falla la recarga del ranking no dice que el borrado falló', async () => {
    vi.mocked(lapidasApi.asesinos).mockRejectedValue(new Error('ranking caído'))

    render(<App />)

    fireEvent.click(await screen.findByRole('button', { name: /borrar la lápida de pepino/i }))
    fireEvent.click(await screen.findByRole('button', { name: /^borrar$/i }))

    expect(await screen.findByText(/no se pudo actualizar el ranking/i)).toBeTruthy()
    expect(screen.queryByText(/no se pudo borrar la lápida/i)).toBeNull()
  })
})

describe('E006 — el borrador de publicación no sobrevive a un cambio de sesión', () => {
  it('el epitafio de un usuario no aparece en el formulario del siguiente', async () => {
    render(<App />)

    // Usuario A: entra y escribe un epitafio sin publicar.
    fireEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }))
    fireEvent.change(screen.getByLabelText(/nombre de usuario/i), {
      target: { value: 'zombie' },
    })
    fireEvent.change(screen.getByLabelText(/contraseña/i), { target: { value: 'secreta123' } })
    fireEvent.click(screen.getByRole('button', { name: /^entrar$/i }))

    fireEvent.click(await screen.findByRole('button', { name: /^publicar$/i }))
    fireEvent.change(screen.getByLabelText(/epitafio/i), {
      target: { value: 'Borrador privado de zombie' },
    })

    // Sale y entra otro usuario en el mismo navegador.
    fireEvent.click(screen.getByRole('button', { name: /salir/i }))
    vi.mocked(sesionesApi.iniciar).mockResolvedValue(sesion({ id: 'u2', username: 'otra' }))
    fireEvent.click(await screen.findByRole('button', { name: /iniciar sesión/i }))
    fireEvent.change(screen.getByLabelText(/nombre de usuario/i), { target: { value: 'otra' } })
    fireEvent.change(screen.getByLabelText(/contraseña/i), { target: { value: 'secreta456' } })
    fireEvent.click(screen.getByRole('button', { name: /^entrar$/i }))

    fireEvent.click(await screen.findByRole('button', { name: /^publicar$/i }))

    const epitafio = screen.getByLabelText(/epitafio/i) as HTMLTextAreaElement
    expect(epitafio.value).toBe('')
  })
})

describe('J003 — una lápida recién publicada aparece en MI PERFIL', () => {
  it('no depende de que el POST devuelva `duenio`', async () => {
    vi.mocked(sesionesApi.actual).mockResolvedValue(sesion())
    // `POST /lapidas` devuelve el documento crudo: sin `duenio`. Solo
    // `GET /lapidas` lo enriquece, así que la lista local queda sin ese campo.
    vi.mocked(lapidasApi.create).mockResolvedValue(
      lapida({ id: 7, nombrePlanta: 'Aloe', autor: 'zombie', usuarioId: 'u1', duenio: undefined }),
    )

    render(<App />)

    fireEvent.click(await screen.findByRole('button', { name: /^publicar$/i }))
    // El select se puebla con las categorías, que llegan por red.
    await screen.findByRole('option', { name: 'Suculentas' })
    fireEvent.change(screen.getByLabelText(/nombre de la planta/i), {
      target: { value: 'Aloe' },
    })
    fireEvent.change(screen.getByLabelText(/categoría/i), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText(/fecha de fallecimiento/i), {
      target: { value: '2025-01-01' },
    })
    fireEvent.change(screen.getByLabelText(/causa de muerte/i), {
      target: { value: 'Poca luz' },
    })
    fireEvent.change(screen.getByLabelText(/epitafio/i), { target: { value: 'Se fue' } })
    fireEvent.click(screen.getByRole('button', { name: /publicar lápida/i }))

    // Publicar vuelve a INICIO; desde ahí, al perfil propio.
    fireEvent.click(await screen.findByRole('button', { name: /@zombie/i }))

    expect(
      await screen.findByRole('button', { name: /ver la lápida de aloe/i }),
    ).toBeTruthy()
  })
})

describe('D002 — las lecturas de la pantalla no se encadenan', () => {
  it('el montaje dispara cementerio, categorías, sesión y ranking a la vez', async () => {
    const cementerio = diferida<Grave[]>()
    const categorias = diferida<{ id: number; nombre: string }[]>()
    const sesionActual = diferida<Session>()
    const ranking = diferida<{ username: string; muertes: number }[]>()

    vi.mocked(lapidasApi.findAll).mockReturnValue(cementerio.promesa)
    vi.mocked(categoriasApi.findAll).mockReturnValue(categorias.promesa)
    vi.mocked(sesionesApi.actual).mockReturnValue(sesionActual.promesa)
    vi.mocked(lapidasApi.asesinos).mockReturnValue(ranking.promesa)

    render(<App />)

    // Nada respondió todavía. Encadenar los `await` deja solo las dos primeras
    // llamadas (las del `Promise.all`), y las otras dos esperan un viaje de red
    // completo antes de salir: tres viajes de ida y vuelta donde alcanza uno.
    expect(lapidasApi.findAll).toHaveBeenCalled()
    expect(categoriasApi.findAll).toHaveBeenCalled()
    expect(sesionesApi.actual).toHaveBeenCalled()
    expect(lapidasApi.asesinos).toHaveBeenCalled()

    // Liberar las promesas para no dejar la app a medio montar.
    cementerio.resolver([])
    categorias.resolver([])
    sesionActual.rechazar(new Error('sin sesión'))
    ranking.resolver([])
    await waitFor(() => expect(screen.queryByText(/cargando el cementerio/i)).toBeNull())
  })

  it('ACTUALIZAR pide el cementerio y el ranking a la vez', async () => {
    render(<App />)

    // El montaje ya resolvió todo; se limpian los contadores para mirar solo
    // lo que dispara el botón.
    await screen.findByRole('button', { name: /^actualizar$/i })
    vi.mocked(lapidasApi.findAll).mockClear()
    vi.mocked(lapidasApi.asesinos).mockClear()

    const cementerio = diferida<Grave[]>()
    const ranking = diferida<{ username: string; muertes: number }[]>()
    vi.mocked(lapidasApi.findAll).mockReturnValue(cementerio.promesa)
    vi.mocked(lapidasApi.asesinos).mockReturnValue(ranking.promesa)

    fireEvent.click(screen.getByRole('button', { name: /^actualizar$/i }))

    expect(lapidasApi.findAll).toHaveBeenCalled()
    expect(lapidasApi.asesinos).toHaveBeenCalled()

    cementerio.resolver([])
    ranking.resolver([])
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^actualizar$/i })).toBeTruthy(),
    )
  })
})

describe('E003 — ver lo que se publicó en otra sesión sin recargar la página', () => {
  it('ACTUALIZAR vuelve a pedir las lápidas', async () => {
    vi.mocked(lapidasApi.findAll)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([lapida({ id: 5, nombrePlanta: 'Helecho' })])

    render(<App />)

    fireEvent.click(await screen.findByRole('button', { name: /^actualizar$/i }))

    expect(
      await screen.findByRole('button', { name: /ver la lápida de helecho/i }),
    ).toBeTruthy()
  })
})
