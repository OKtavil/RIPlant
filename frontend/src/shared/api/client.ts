/**
 * Cliente HTTP de R.I.Planta.
 *
 * Reglas:
 * - La sesión viaja en cookie httpOnly, por eso todas las llamadas mandan
 *   `credentials: 'include'`.
 * - Un error HTTP se traduce a `ApiError` con el código de estado para que la
 *   UI decida la copia (401, 403, 404, 409, 429, 400 o caída de red).
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export class ApiError extends Error {
  readonly status: number
  readonly codigo: 'sin-conexion' | 'no-autorizado' | 'prohibido' | 'limite' | 'conflicto' | 'invalido' | 'no-encontrado' | 'desconocido'

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
    case 409:
      return { codigo: 'conflicto', mensaje: 'Ese registro ya existe.' }
    case 429:
      return { codigo: 'limite', mensaje: 'Demasiados intentos. Esperá un momento antes de reintentar.' }
    default:
      return { codigo: 'desconocido', mensaje: 'Ocurrió un error inesperado.' }
  }
}

/**
 * Extrae el mensaje que definió el backend.
 *
 * Nest devuelve `{ statusCode, message, error }`, y `class-validator` manda
 * `message` como array. Ese texto es más útil que el genérico de
 * `clasificar()` (`"No podés coronarte a vos mismo"` en vez de `"Tu cuenta no
 * tiene permiso para esta acción."`), así que se prioriza cuando existe.
 *
 * El cuerpo se lee sobre un `clone()` para no consumir la respuesta original,
 * y cualquier fallo de parseo cae al mensaje por defecto: un HTML intermedio
 * de un proxy no debe romper el manejo de errores.
 */
async function leerMensajeError(response: Response, porDefecto: string): Promise<string> {
  try {
    const cuerpo: unknown = await response.clone().json()
    if (cuerpo && typeof cuerpo === 'object') {
      const { message, error } = cuerpo as { message?: unknown; error?: unknown }
      if (typeof message === 'string' && message.trim()) return message
      if (Array.isArray(message)) {
        const partes = message.filter((parte): parte is string => typeof parte === 'string' && !!parte.trim())
        if (partes.length > 0) return partes.join(' ')
      }
      if (typeof error === 'string' && error.trim()) return error
    }
  } catch {
    // Cuerpo vacío o no-JSON: queda el mensaje por defecto.
  }
  return porDefecto
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
    throw new ApiError(response.status, codigo, await leerMensajeError(response, mensaje))
  }

  if (sinCuerpo || response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

/**
 * Subida multipart.
 *
 * Vive aparte de `request` porque `FormData` no se puede JSON-serializar: el
 * `Content-Type` lo tiene que poner el browser, que además agrega el `boundary`
 * del multipart. Fijarlo a mano dejaría el body ilegible para multer.
 */
export async function subirArchivo<T>(path: string, campo: string, archivo: File): Promise<T> {
  const cuerpo = new FormData()
  cuerpo.append(campo, archivo)

  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      credentials: 'include',
      body: cuerpo,
    })
  } catch {
    throw new ApiError(0, 'sin-conexion', 'No se pudo conectar con el servidor.')
  }

  if (!response.ok) {
    const { codigo, mensaje } = clasificar(response.status)
    throw new ApiError(response.status, codigo, await leerMensajeError(response, mensaje))
  }

  return (await response.json()) as T
}
