import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class CreateComentarioDto {
  @IsString()
  @IsNotEmpty({ message: 'El comentario no puede estar vacío' })
  // `IsNotEmpty` deja pasar `'   '`: para un comentario, eso es ruido, no texto.
  @Matches(/\S/, { message: 'El comentario no puede tener solo espacios' })
  @MaxLength(500, { message: 'El comentario no puede superar los 500 caracteres' })
  texto: string;
}
