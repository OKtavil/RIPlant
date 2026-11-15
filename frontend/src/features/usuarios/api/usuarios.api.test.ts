import { afterEach, describe, expect, it, vi } from 'vitest'
import { usuariosApi } from './usuarios.api'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const fetchMock = vi.fn()

afterEach(() => {
  vi.unstubAllGlobals()
  fetchMock.mockReset()
})

function conRespuesta(respuesta: Response) {
  vi.stubGlobal('fetch', fetchMock.mockResolvedValue(respuesta))
}

describe('usuariosApi', () => {
  it('actualizarPerfil envía los campos opcionales y la foto como multipart', async () => {
    conRespuesta(Response.json({ id: 'u1', descripcion: 'Hola', avatarUrl: '/uploads/avatar.png' }))
    const foto = new File(['imagen'], 'perfil.png', { type: 'image/png' })

    await usuariosApi.actualizarPerfil('u1', {
      descripcion: 'Hola',
      passwordActual: 'clave-anterior',
      passwordNueva: 'clave-nueva-1',
      foto,
    })

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(`${BASE}/usuarios/u1/perfil`)
    expect(init.method).toBe('PUT')
    expect(init.credentials).toBe('include')
    expect(init.headers).toBeUndefined()
    const cuerpo = init.body as FormData
    expect(cuerpo.get('descripcion')).toBe('Hola')
    expect(cuerpo.get('passwordActual')).toBe('clave-anterior')
    expect(cuerpo.get('passwordNueva')).toBe('clave-nueva-1')
    expect(cuerpo.get('foto')).toBe(foto)
  })

  it('emitirCodigoRecuperacion hace POST /usuarios/:id/codigo-recuperacion con la contraseña actual', async () => {
    conRespuesta(Response.json({ codigoRecuperacion: 'ABCD-EFGH-IJKL-MNOP' }))

    const { codigoRecuperacion } = await usuariosApi.emitirCodigoRecuperacion(
      'u1',
      'clave-actual-1',
    )

    expect(codigoRecuperacion).toBe('ABCD-EFGH-IJKL-MNOP')
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(`${BASE}/usuarios/u1/codigo-recuperacion`)
    expect(init.method).toBe('POST')
    // La cookie de sesión decide quién puede emitir: sin ella el backend da 401.
    expect(init.credentials).toBe('include')
    expect(init.body).toBe(JSON.stringify({ passwordActual: 'clave-actual-1' }))
  })

  it('emitirCodigoRecuperacion no manda contraseña cuando el admin emite para otro', async () => {
    conRespuesta(Response.json({ codigoRecuperacion: 'ABCD-EFGH-IJKL-MNOP' }))

    await usuariosApi.emitirCodigoRecuperacion('u2')

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    // Mandar `passwordActual: undefined` no cambia nada en el backend, pero
    // ensucia el contrato: sin contraseña el cuerpo va vacío.
    expect(init.body).toBe(JSON.stringify({}))
  })

  it('un 403 al emitir se propaga como ApiError prohibido', async () => {
    conRespuesta(
      Response.json({ message: 'La contraseña actual no es correcta' }, { status: 403 }),
    )

    await expect(usuariosApi.emitirCodigoRecuperacion('u1', 'mala')).rejects.toMatchObject({
      status: 403,
      codigo: 'prohibido',
    })
  })
})
