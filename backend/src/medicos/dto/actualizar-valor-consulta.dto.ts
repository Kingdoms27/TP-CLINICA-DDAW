import {
  IsInt,
  IsPositive,
} from 'class-validator';

export class ActualizarValorConsultaDto {
  @IsInt()
  @IsPositive()
  valorConsulta: number;
}