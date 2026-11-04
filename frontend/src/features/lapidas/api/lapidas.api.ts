import { request, subirArchivo } from '../../../shared/api/client'
import type { Asesino, CreateGraveInput, Grave } from '../model/lapida'

export const lapidasApi = {
  findAll: () => request<Grave[]>('/lapidas'),

  /** Ranking de muertes por usuario, ya agregado y ordenado por el backend. */
  asesinos: () => request<Asesino[]>('/lapidas/asesinos'),

  findById: (id: number) => request<Grave>(`/lapidas/${id}`),

  create: (input: CreateGraveInput) =>
    request<Grave>('/lapidas', { method: 'POST', body: input }),

  update: (id: number, input: Partial<CreateGraveInput>) =>
    request<Grave>(`/lapidas/${id}`, { method: 'PUT', body: input }),

  remove: (id: number) =>
    request<void>(`/lapidas/${id}`, { method: 'DELETE', sinCuerpo: true }),

  /** Revive una lápida propia (solo dueño/admin). Otorga la insignia al dueño. */
  revivir: (id: number) => request<Grave>(`/lapidas/${id}/revivir`, { method: 'POST' }),

  /** Incrementa el contador de coronas y devuelve la lápida actualizada. */
  giveCorona: (id: number) =>
    request<Grave>(`/lapidas/${id}/corona`, { method: 'POST' }),

  /**
   * Quita la corona de **este** usuario (no la de todos). Idempotente: `200`
   * tenga o no corona. El filtro por `usuarioId` vive en el servicio, así que
   * nadie puede quitarle la corona a otro.
   */
  quitarCorona: (id: number) =>
    request<Grave>(`/lapidas/${id}/corona`, { method: 'DELETE' }),

  /**
   * Sube (o reemplaza) la foto de una lápida ya creada. Solo el dueño o un
   * admin: la autorización la resuelve `DuenoOAdminLapidaMiddleware`.
   *
   * Va en dos pasos porque el endpoint cuelga de `:id`: primero se crea la
   * lápida con `create`, después se le adjunta la foto con su id. El tope de
   * 5 MB lo aplica multer; la UI lo chequea antes para no gastar la subida.
   */
  subirFoto: (id: number, archivo: File) =>
    subirArchivo<Grave>(`/lapidas/${id}/foto`, 'foto', archivo),
}
