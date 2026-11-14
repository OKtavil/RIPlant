import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Cuerpo de `POST /usuarios/:id/codigo-recuperacion`.
 *
 * `passwordActual` es opcional en el DTO porque un admin no la necesita. La
 * regla real (dueño ⇒ contraseña obligatoria) vive en el servicio: depende del
 * rol y del dueño, y el DTO no conoce ni uno ni otro.
 */
export class EmitirCodigoRecuperacionDTO {
  @IsOptional()
  @IsString({ message: 'La contraseña actual debe ser una cadena de texto' })
  @MaxLength(72, {
    message: 'La contraseña actual debe tener como máximo 72 caracteres',
  })
  passwordActual?: string;
}
