import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

/**
 * Credenciales de login.
 *
 * `@Matches(/\S/)` no reemplaza a `@IsNotEmpty`: lo completa. `@IsNotEmpty` es
 * `value !== '' && value !== null && value !== undefined`, así que **`" "` lo
 * pasa** y llegaba hasta el servicio, donde se compara contra un `username`
 * real sin normalizar. No es un bypass —el schema tiene `trim: true`, así que
 * no se puede registrar un usuario que normalice a otro— pero sí es un intento
 * que gasta una comparación bcrypt contra el cebo sin ser una credencial.
 * `CreateCategoriaDTO` ya usa este mismo criterio para `nombre`.
 */
export class IniciarSesionDTO {
  @IsString({ message: 'El usuario debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El usuario es obligatorio' })
  @MaxLength(50, { message: 'El usuario debe tener como máximo 50 caracteres' })
  @Matches(/\S/, {
    message: 'El usuario no debe contener solo espacios en blanco',
  })
  username: string;

  @IsString({ message: 'La contraseña debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  @Matches(/\S/, {
    message: 'La contraseña no debe contener solo espacios en blanco',
  })
  password: string;
}
