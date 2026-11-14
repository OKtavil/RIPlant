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
  /**
   * Emite un código de recuperación nuevo y lo devuelve en claro, una sola vez.
   *
   * `passwordActual` solo viaja cuando el dueño rota su propio código: el
   * backend exige probar la contraseña para que una sesión robada no pueda
   * quedarse con la cuenta. Un admin emitiendo para otro no la necesita.
   */
  emitirCodigoRecuperacion: (id: string, passwordActual?: string) =>
    request<{ codigoRecuperacion: string }>(`/usuarios/${id}/codigo-recuperacion`, {
      method: 'POST',
      body: passwordActual === undefined ? {} : { passwordActual },
    }),
}
