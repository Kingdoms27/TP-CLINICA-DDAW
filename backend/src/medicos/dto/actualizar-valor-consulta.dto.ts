import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsPositive,
} from 'class-validator';

export class ActualizarValorConsultaDto {
  @IsInt()
  @IsPositive()
  @ApiProperty()
  valorConsulta: number;
}