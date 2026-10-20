import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateComentarioDto {
  @IsString()
  @IsNotEmpty({ message: 'El comentario no puede estar vacío' })
  @MaxLength(500, { message: 'El comentario no puede superar los 500 caracteres' })
  texto: string;
}
