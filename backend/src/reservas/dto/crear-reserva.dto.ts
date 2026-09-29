import {
  IsInt,
  IsISO8601,
  IsOptional,
  IsPositive,
} from 'class-validator';

export class CrearReservaDto {
  @IsInt()
  @IsPositive()
  idMedico: number;

  @IsISO8601()
  fechaHora: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  idPaciente?: number;
}