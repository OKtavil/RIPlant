import { request } from '../../../shared/api/client'
import type { Session } from '../../sesiones/model/sesion'

export type UsuarioPublico = {
  id: string
  username: string
  rol: string
  insignias?: Session['insignias']
  descripcion?: string
}

export const usuariosApi = {
  listar: () => request<UsuarioPublico[]>('/usuarios'),
  obtener: (id: string) => request<UsuarioPublico>(`/usuarios/${id}`),
  actualizarDescripcion: (id: string, descripcion: string) =>
    request<UsuarioPublico>(`/usuarios/${id}/descripcion`, {
      method: 'PUT',
      body: { descripcion },
    }),
}
