import {
  IsInt,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateLapidaDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  nombrePlanta: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(280)
  epitafio: string;

  @IsDateString({}, { message: 'La fecha de fallecimiento debe ser válida' })
  fechaFallecimiento: string;

  @IsInt()
  categoriaId: number;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  causaMuerte: string;

  /**
   * S8: la foto ya no se acepta por el JSON de crear/editar, solo por
   * `POST /lapidas/:id/foto`. Se declara igual para que `forbidNonWhitelisted`
   * no rechace el campo con un 400: el servicio lo ignora y la ruta real es el
   * endpoint de subida.
   */
  @IsOptional()
  @IsString()
  fotoUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  autor?: string;

  /**
   * Ignorado intencionalmente. POST /lapidas estampa el usuarioId desde la
   * sesión (dueño-o-admin via middleware cuando se edita; al crear exige sesión).
   */
  @IsOptional()
  @IsString()
  usuarioId?: string;
}
