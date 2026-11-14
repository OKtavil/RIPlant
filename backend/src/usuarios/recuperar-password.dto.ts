import {
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Cuerpo de `POST /usuarios/recuperar`.
 *
 * El código se capa en 64 caracteres aunque el real tenga 19: alcanza para
 * tolerar guiones y espacios de más sin hashear una entrada arbitrariamente
 * grande. Si después de normalizar no coincide, el servicio responde el mismo
 * error genérico que un código inválido.
 */
export class RecuperarPasswordDTO {
  @IsString({ message: 'El usuario debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El usuario es obligatorio' })
  @Matches(/\S/, {
    message: 'El usuario no puede estar vacío ni tener solo espacios',
  })
  @MaxLength(50, {
    message: 'El usuario debe tener como máximo 50 caracteres',
  })
  username: string;

  @IsString({ message: 'El código debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El código de recuperación es obligatorio' })
  @MaxLength(64, {
    message: 'El código de recuperación debe tener como máximo 64 caracteres',
  })
  codigo: string;

  @IsString({ message: 'La contraseña debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  // bcrypt trunca en 72 bytes y no lo dice: el mismo límite que el alta.
  @MaxLength(72, {
    message: 'La contraseña debe tener como máximo 72 caracteres',
  })
  password: string;
}
