/**
 * Modelo de comentario (S6).
 *
 * El backend expone el `_id` de Mongo como `id` **string**, no como el entero
 * de `lapidas` y `categorias`. Es a propósito: un comentario lo crea cualquiera
 * con sesión y un contador `max + 1` sería una carrera real.
 *
 * `autor` viene sin `@` — es el `username` pelado. El `@` lo pone la UI, igual
 * que con `nombreDelDuenio()` en las lápidas.
 */

export type Comentario = {
  id: string
  lapidaId: number
  usuarioId: string
  autor: string
  texto: string
  /** ISO 8601. El GET los devuelve en orden ascendente. */
  creadoEn: string
}

/** Límite que valida el backend con `@MaxLength(500)`. */
export const LARGO_MAXIMO_TEXTO = 500

/**
 * Un comentario vacío o de solo espacios lo rechaza el backend con `400`
 * (`@IsNotEmpty`). Se valida también en el cliente para no gastar una petición
 * y para poder deshabilitar el botón.
 */
export function esTextoValido(texto: string): boolean {
  const limpio = texto.trim()
  return limpio.length > 0 && limpio.length <= LARGO_MAXIMO_TEXTO
}
