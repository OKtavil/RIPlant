/**
 * Un comentario en el detalle de una lápida (S6).
 *
 * El identificador expuesto es el `_id` de Mongo serializado como string. La
 * spec define los campos del comentario sin ningún id numérico, y un contador
 * `max + 1` como el de `lapidas` y `categorias` es una carrera real acá: es un
 * recurso que crea cualquiera con sesión y dos creaciones simultáneas se
 * pisarían. `usuarioId` ya es un ObjectId-string en este API, así que no se
 * introduce una segunda convención.
 */
export interface Comentario {
  id: string;
  lapidaId: number;
  usuarioId: string;
  autor: string;
  texto: string;
  creadoEn: Date;
}
