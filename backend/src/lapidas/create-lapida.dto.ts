import { Transform } from 'class-transformer';
import {
  IsInt,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { EsFechaDeFallecimiento } from './fecha-fallecimiento.validator';

export class CreateLapidaDto {
  /**
   * `@Transform` recorta antes de validar: `@IsNotEmpty` solo rechaza `''`,
   * así que `'   '` pasaba y se guardaba como texto en blanco (D001).
   */
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  nombrePlanta: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(280)
  epitafio: string;

  @IsDateString({}, { message: 'La fecha de fallecimiento debe ser válida' })
  @EsFechaDeFallecimiento({
    message: 'La fecha de fallecimiento debe estar entre el 01/01/1900 y hoy',
  })
  fechaFallecimiento: string;

  @IsInt()
  categoriaId: number;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
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
