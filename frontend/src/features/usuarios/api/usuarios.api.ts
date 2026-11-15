import { request, subirArchivo } from '../../../shared/api/client'
import type { Session } from '../../sesiones/model/sesion'

export type UsuarioPublico = {
  id: string
  username: string
  rol: string
  insignias?: Session['insignias']
  descripcion?: string
  avatarUrl?: string
}

export type ActualizarPerfil = {
  descripcion?: string
  passwordActual?: string
  passwordNueva?: string
  foto?: File
}

export const usuariosApi = {
  listar: () => request<UsuarioPublico[]>('/usuarios'),
  obtener: (id: string) => request<UsuarioPublico>(`/usuarios/${id}`),
  actualizarPerfil: (id: string, datos: ActualizarPerfil) => {
    const { foto, ...campos } = datos
    return subirArchivo<UsuarioPublico>(
      `/usuarios/${id}/perfil`,
      'foto',
      foto,
      campos,
      'PUT',
    )
  },
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
