import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

export class CreateCategoriaDTO {
  @IsString({
    message: 'El nombre de la categoría debe ser una cadena de texto',
  })
  @IsNotEmpty({
    message: 'El nombre de la categoría no debe estar vacío',
  })
  @MinLength(3, {
    message: 'El nombre de la categoría debe tener al menos 3 caracteres',
  })
  @MaxLength(20, {
    message: 'El nombre de la categoría debe tener como máximo 20 caracteres',
  })
  @Matches(/\S/, {
    message:
      'El nombre de la categoría no debe contener solo espacios en blanco',
  })
  nombre: string;
}
