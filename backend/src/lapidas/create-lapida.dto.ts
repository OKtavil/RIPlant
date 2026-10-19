import {
  IsInt,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
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

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  causaMuerte: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  fotoUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  autor?: string;
}
