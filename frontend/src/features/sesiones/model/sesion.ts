/**
 * Modelo de sesión.
 *
 * El backend devuelve `{ id, username, rol, expiraEn }`; `rol` decide si la
 * pantalla de Categorías permite mutar.
 */

export type Rol = 'usuario' | 'admin'

/**
 * Un logro del usuario, tal como lo devuelve la sesión.
 *
 * `codigo` es el identificador estable (`superviviente-zombie`); el nombre
 * visible lo pone la UI. `lapidaId` y `obtenidaEn` permiten explicar *por qué*
 * y *cuándo* se obtuvo, en vez de mostrar la insignia sin contexto.
 */
export type Insignia = {
  codigo: string
  lapidaId: number
  obtenidaEn: string
}

/** Código de la insignia que se otorga al revivir una lápida propia. */
export const INSIGNIA_SUPERVIVIENTE = 'superviviente-zombie'

export type Session = {
  id: string
  username: string
  rol: Rol
  /** Logros obtenidos. `[]` cuando no tiene ninguno. */
  insignias: Insignia[]
  expiraEn: string
}

/** La insignia de superviviente, si este usuario la tiene. */
export function insigniaSuperviviente(sesion: Session | null): Insignia | undefined {
  return sesion?.insignias.find((insignia) => insignia.codigo === INSIGNIA_SUPERVIVIENTE)
}

export type Credenciales = {
  username: string
  password: string
}

/** Sub-vistas de autenticación que se navegan sin cambiar de ruta. */
export type VistaAuth = 'login' | 'registro' | 'recuperar' | 'restablecer'
