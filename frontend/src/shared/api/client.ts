/**
 * Cliente HTTP de R.I.Planta.
 *
 * Reglas:
 * - La sesión viaja en cookie httpOnly, por eso todas las llamadas mandan
 *   `credentials: 'include'`.
 * - Un error HTTP se traduce a `ApiError` con el código de estado para que la
 *   UI decida la copia (401, 403, 429, 400, 404 o caída de red).
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export class ApiError extends Error {
  readonly status: number
  readonly codigo: 'sin-conexion' | 'no-autorizado' | 'prohibido' | 'limite' | 'invalido' | 'no-encontrado' | 'desconocido'

  constructor(status: number, codigo: ApiError['codigo'], mensaje: string) {
    super(mensaje)
    this.name = 'ApiError'
    this.status = status
    this.codigo = codigo
  }
}

function clasificar(status: number): { codigo: ApiError['codigo']; mensaje: string } {
  switch (status) {
    case 400:
      return { codigo: 'invalido', mensaje: 'Los datos enviados no son válidos.' }
    case 401:
      return { codigo: 'no-autorizado', mensaje: 'Necesitás iniciar sesión.' }
    case 403:
      return { codigo: 'prohibido', mensaje: 'Tu cuenta no tiene permiso para esta acción.' }
    case 404:
      return { codigo: 'no-encontrado', mensaje: 'El recurso solicitado no existe.' }
    case 429:
      return { codigo: 'limite', mensaje: 'Demasiados intentos. Esperá un momento antes de reintentar.' }
    default:
      return { codigo: 'desconocido', mensaje: 'Ocurrió un error inesperado.' }
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
  /** `DELETE` sin cuerpo devuelve `204`: no hay JSON que parsear. */
  sinCuerpo?: boolean
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, sinCuerpo = false } = options

  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      credentials: 'include',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, 'sin-conexion', 'No se pudo conectar con el servidor.')
  }

  if (!response.ok) {
    const { codigo, mensaje } = clasificar(response.status)
    throw new ApiError(response.status, codigo, mensaje)
  }

  if (sinCuerpo || response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}
