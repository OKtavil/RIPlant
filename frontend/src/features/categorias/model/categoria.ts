/** Modelo de categoría. Claves en español: contrato del backend. */

export type Category = {
  id: number
  nombre: string
}

/** El DTO de categorías valida `minlength: 3` y `maxlength: 20`. */
export const CATEGORIA_MIN = 3
export const CATEGORIA_MAX = 20

/** Pluraliza el conteo de lápidas con la forma que usa el prototipo. */
export function contarLapidas(n: number): string {
  return n === 1 ? '1 lápida' : `${n} lápidas`
}
