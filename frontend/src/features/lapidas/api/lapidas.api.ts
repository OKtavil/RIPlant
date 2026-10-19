import { request } from '../../../shared/api/client'
import type { CreateGraveInput, Grave } from '../model/lapida'

export const lapidasApi = {
  findAll: () => request<Grave[]>('/lapidas'),

  findById: (id: number) => request<Grave>(`/lapidas/${id}`),

  create: (input: CreateGraveInput) =>
    request<Grave>('/lapidas', { method: 'POST', body: input }),

  update: (id: number, input: Partial<CreateGraveInput>) =>
    request<Grave>(`/lapidas/${id}`, { method: 'PUT', body: input }),

  remove: (id: number) =>
    request<void>(`/lapidas/${id}`, { method: 'DELETE', sinCuerpo: true }),

  /** Incrementa el contador de coronas y devuelve la lápida actualizada. */
  giveCorona: (id: number) =>
    request<Grave>(`/lapidas/${id}/corona`, { method: 'POST' }),
}
