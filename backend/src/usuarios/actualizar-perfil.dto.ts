import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ActualizarPerfilDTO {
  @IsOptional()
  @IsString({ message: 'La descripción debe ser una cadena de texto' })
  @MaxLength(280, { message: 'La descripción debe tener como máximo 280 caracteres' })
  descripcion?: string;

  @IsOptional()
  @IsString({ message: 'La contraseña actual debe ser una cadena de texto' })
  @MaxLength(72, { message: 'La contraseña actual debe tener como máximo 72 caracteres' })
  passwordActual?: string;

  @IsOptional()
  @IsString({ message: 'La nueva contraseña debe ser una cadena de texto' })
  @MinLength(8, { message: 'La nueva contraseña debe tener al menos 8 caracteres' })
  @MaxLength(72, { message: 'La nueva contraseña debe tener como máximo 72 caracteres' })
  passwordNueva?: string;
}
