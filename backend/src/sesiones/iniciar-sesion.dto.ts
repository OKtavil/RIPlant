import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class IniciarSesionDTO {
  @IsString({ message: 'El usuario debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El usuario es obligatorio' })
  @MaxLength(50, { message: 'El usuario debe tener como máximo 50 caracteres' })
  username: string;

  @IsString({ message: 'La contraseña debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  password: string;
}
