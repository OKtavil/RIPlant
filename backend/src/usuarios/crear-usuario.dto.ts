import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import type { Rol } from './usuario.interface';

export class CrearUsuarioDTO {
  @IsString({ message: 'El usuario debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El usuario es obligatorio' })
  @MaxLength(50, { message: 'El usuario debe tener como máximo 50 caracteres' })
  username: string;

  @IsString({ message: 'La contraseña debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password: string;

  /**
   * Ignorado intencionalmente. El rol siempre se fuerza a 'usuario' en el
   * controlador para que nunca se pueda registrar un administrador desde aquí.
   */
  @IsOptional()
  @IsIn(['usuario', 'admin'], { message: 'El rol no es válido' })
  rol?: Rol;
}
