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
