import { request } from '../../../shared/api/client'
import type { Credenciales, Session } from '../model/sesion'

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
  registrar: (credenciales: Credenciales) =>
    request<Session>('/usuarios', { method: 'POST', body: credenciales }),

  cerrar: () => request<void>('/sesiones', { method: 'DELETE', sinCuerpo: true }),
}
