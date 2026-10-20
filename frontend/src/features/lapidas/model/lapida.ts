/**
 * Modelo de lápida.
 *
 * Las claves del payload van en español porque son el contrato del backend
 * (`backend/src/lapidas/lapida.schema.ts`); los nombres de los tipos van en
 * inglés.
 */

export type Grave = {
  id: number
  nombrePlanta: string
  epitafio: string
  fechaFallecimiento: string
  fechaPublicacion: string
  autor: string
  categoriaId: number
  causaMuerte: string
  fotoUrl: string
  coronasCount: number
  /** Id del usuario dueño; `''` en datos anteriores a la propiedad. */
  usuarioId: string
  /**
   * Dueño resuelto por el backend contra `usuarios.username`. Es la fuente de
   * verdad de la identidad: `autor` es texto libre y puede no coincidir.
   */
  duenio?: { username: string; rol: string }
}

/** Fila de `GET /lapidas/asesinos`. */
export type Asesino = {
  username: string
  muertes: number
}

export type CreateGraveInput = {
  nombrePlanta: string
  epitafio: string
  fechaFallecimiento: string
  categoriaId: number
  causaMuerte: string
  fotoUrl?: string
  autor?: string
}

/** Escala de colores placeholder que usa el prototipo en la "foto" de la lápida. */
export const COLORES_FOTO = ['#7CB342', '#C0392B', '#E8B94A', '#6C8E4E', '#9B7EDE'] as const

/** Color estable por lápida: la misma lápida siempre muestra el mismo color. */
export function colorDeFoto(id: number): string {
  const indice = Math.abs(id) % COLORES_FOTO.length
  return COLORES_FOTO[indice]
}

/** Formatea `dd/mm/aaaa`, como el prototipo, sin depender de la zona horaria. */
export function formatearFecha(fecha: string): string {
  const soloFecha = fecha.slice(0, 10)
  const [anio, mes, dia] = soloFecha.split('-')
  if (!anio || !mes || !dia) return fecha
  return `${dia}/${mes}/${anio}`
}

/**
 * Nombre con el que se muestra al dueño de una lápida, sin la `@`.
 *
 * Usa `duenio.username`, que el backend resuelve contra `usuarios.username` y
 * es la identidad real. `autor` es texto libre que el usuario escribe al
 * publicar y puede decir cualquier cosa: en los datos reales hay lápidas cuyo
 * `autor` dice "Anónimo" o "Rosa Verde" mientras el dueño es `zombie` o `admin`.
 *
 * Cae a `autor` solo cuando el backend no pudo resolver al dueño, para no
 * mostrar un vacío en datos anteriores a la propiedad `duenio`.
 */
export function nombreDelDuenio(lapida: Grave): string {
  return lapida.duenio?.username || lapida.autor
}

/** Lo mínimo de una sesión para decidir permisos. */
type SesionParaPermisos = { username: string; rol: string; id?: string } | null

/**
 * Espeja la regla del backend (`dueno-o-admin-lapida.middleware.ts`): el dueño
 * de la lápida o un admin. La UI la usa para mostrar u ocultar el control, pero
 * la decisión real la toma el backend: ocultar el botón no es un control de
 * seguridad.
 *
 * Compara contra `usuarioId` y no contra `duenio.username` porque `POST
 * /lapidas` y `POST /lapidas/:id/corona` **no devuelven `duenio`** (solo
 * `GET /lapidas` lo enriquece). Confiar solo en `duenio` haría desaparecer el
 * botón al publicar una lápida o al darle una corona.
 */
export function puedeBorrar(lapida: Grave, sesion: SesionParaPermisos): boolean {
  if (!sesion) return false
  if (sesion.rol === 'admin') return true
  if (lapida.usuarioId && sesion.id && lapida.usuarioId === sesion.id) return true
  return lapida.duenio?.username === sesion.username
}
