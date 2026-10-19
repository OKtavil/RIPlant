import { request } from '../../../shared/api/client'
import type { Credenciales, Session } from '../model/sesion'

export const sesionesApi = {
  /** Sesión vigente. Lanza `ApiError` con código `no-autorizado` si no hay. */
  actual: () => request<Session>('/sesiones/actual'),

  iniciar: (credenciales: Credenciales) =>
    request<Session>('/sesiones', { method: 'POST', body: credenciales }),

  cerrar: () => request<void>('/sesiones', { method: 'DELETE', sinCuerpo: true }),
}
