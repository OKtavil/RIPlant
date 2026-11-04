import { IsString, MaxLength } from 'class-validator';

/**
 * Cuerpo de `PUT /usuarios/:id/descripcion`.
 *
 * Se valida acá y no en el servicio para que el `ValidationPipe` global
 * devuelva un 400 con mensaje claro en vez de guardar un valor recortado sin
 * avisar. La cadena vacía es válida: borrar la descripción es una acción
 * legítima.
 */
export class ActualizarDescripcionDTO {
  @IsString({ message: 'La descripción debe ser una cadena de texto' })
  @MaxLength(280, { message: 'La descripción debe tener como máximo 280 caracteres' })
  descripcion: string;
}
