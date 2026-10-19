import { request } from '../../../shared/api/client'
import type { Category } from '../model/categoria'

export const categoriasApi = {
  findAll: () => request<Category[]>('/categorias'),

  create: (nombre: string) =>
    request<Category>('/categorias', { method: 'POST', body: { nombre } }),

  update: (id: number, nombre: string) =>
    request<Category>(`/categorias/${id}`, { method: 'PUT', body: { nombre } }),

  remove: (id: number) =>
    request<void>(`/categorias/${id}`, { method: 'DELETE', sinCuerpo: true }),
}
