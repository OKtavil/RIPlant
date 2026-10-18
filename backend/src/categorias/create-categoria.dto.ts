import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';

export class CreateCategoriaDTO {
  @IsString({
    message: 'El nombre de la categoría debe ser una cadena de texto',
  })
  @IsNotEmpty({ message: 'El nombre de la categoría es obligatorio' })
  @MinLength(3, {
    message: 'El nombre de la categoría debe tener al menos 3 caracteres',
  })
  @MaxLength(20, {
    message: 'El nombre de la categoría no puede tener más de 20 caracteres',
  })
  nombre: string;
}
