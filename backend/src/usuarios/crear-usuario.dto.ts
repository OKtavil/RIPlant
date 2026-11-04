import { IsIn, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import type { Rol } from './usuario.interface';

export class CrearUsuarioDTO {
  @IsString({ message: 'El usuario debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El usuario es obligatorio' })
  // `'   '` no está vacío para `IsNotEmpty`; después del `trim` del servicio
  // quedaba en `''` y el schema respondía 500 (V001).
  @Matches(/\S/, { message: 'El usuario no puede estar vacío ni tener solo espacios' })
  @MaxLength(50, { message: 'El usuario debe tener como máximo 50 caracteres' })
  username: string;

  @IsString({ message: 'La contraseña debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  // bcrypt trunca en 72 bytes y no lo dice: aceptar más sería guardar un hash
  // de una contraseña distinta a la que el usuario escribió.
  @MaxLength(72, { message: 'La contraseña debe tener como máximo 72 caracteres' })
  password: string;

  /**
   * Ignorado intencionalmente. El rol siempre se fuerza a 'usuario' en el
   * controlador para que nunca se pueda registrar un administrador desde aquí.
   */
  @IsOptional()
  @IsIn(['usuario', 'admin'], { message: 'El rol no es válido' })
  rol?: Rol;
}
