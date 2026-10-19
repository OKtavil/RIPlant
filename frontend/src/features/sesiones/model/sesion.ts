/**
 * Modelo de sesión.
 *
 * El backend devuelve `{ id, username, rol, expiraEn }`; `rol` decide si la
 * pantalla de Categorías permite mutar.
 */

export type Rol = 'usuario' | 'admin'

export type Session = {
  id: string
  username: string
  rol: Rol
  expiraEn: string
}

export type Credenciales = {
  username: string
  password: string
}

/** Sub-vistas de autenticación que se navegan sin cambiar de ruta. */
export type VistaAuth = 'login' | 'registro' | 'recuperar' | 'restablecer'
