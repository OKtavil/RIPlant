import { request } from '../../../shared/api/client'
import type { Credenciales, RecuperarPassword, Session } from '../model/sesion'

/**
 * El alta devuelve dos cosas distintas en un mismo cuerpo: la sesión (que es lo
 * que el resto de la app usa) y el código de recuperación (que se muestra una
 * sola vez). Se separan acá para que nadie guarde el código junto a la sesión.
 */
export type AltaUsuario = {
  sesion: Session
  codigoRecuperacion: string
}

export const sesionesApi = {
  /** Sesión vigente. Lanza `ApiError` con código `no-autorizado` si no hay. */
  actual: () => request<Session>('/sesiones/actual'),

  iniciar: (credenciales: Credenciales) =>
    request<Session>('/sesiones', { method: 'POST', body: credenciales }),

  /**
   * Alta de cuenta con auto-login: el backend responde `201` con la misma
   * forma que `/sesiones` y deja la cookie de sesión puesta. El `rol` lo
   * decide el servidor; el cliente nunca lo manda.
   */
  registrar: async (credenciales: Credenciales): Promise<AltaUsuario> => {
    const { codigoRecuperacion, ...sesion } = await request<
      Session & { codigoRecuperacion: string }
    >('/usuarios', { method: 'POST', body: credenciales })
    return { sesion, codigoRecuperacion }
  },

  /**
   * Recuperación sin sesión: cambia la contraseña usando el código de un solo
   * uso. El backend responde `200` con `{ mensaje }` y cierra las sesiones
   * abiertas del usuario, así que la cookie que hubiera ya no sirve.
   */
  recuperar: (datos: RecuperarPassword) =>
    request<{ mensaje: string }>('/usuarios/recuperar', { method: 'POST', body: datos }),

  cerrar: () => request<void>('/sesiones', { method: 'DELETE', sinCuerpo: true }),
}
