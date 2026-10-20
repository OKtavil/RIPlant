import { request } from '../../../shared/api/client'
import type { Comentario } from '../model/comentario'

/**
 * Cliente de comentarios (S6).
 *
 * El `DELETE` vive en `/comentarios/:id`, **no** bajo `/lapidas/:id`: el
 * controller del backend no lleva prefijo justamente porque S6 pide rutas en
 * dos colecciones distintas. Un `DELETE /lapidas/:id/comentarios/:cid` daría
 * `404`.
 */
export const comentariosApi = {
  /** Público. Orden ascendente por fecha, ya resuelto por el backend. */
  listar: (lapidaId: number) => request<Comentario[]>(`/lapidas/${lapidaId}/comentarios`),

  /**
   * Requiere sesión. El `autor` y el `usuarioId` salen de la sesión, no del
   * cuerpo: lo único que decide el cliente es el texto.
   */
  crear: (lapidaId: number, texto: string) =>
    request<Comentario>(`/lapidas/${lapidaId}/comentarios`, {
      method: 'POST',
      body: { texto },
    }),
}
