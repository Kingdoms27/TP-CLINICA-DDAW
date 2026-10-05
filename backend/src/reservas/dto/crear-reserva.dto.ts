import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsISO8601,
  IsOptional,
  IsPositive,
} from 'class-validator';

export class CrearReservaDto {
  @IsInt()
  @IsPositive()
  @ApiProperty()
  idMedico: number;

  @IsISO8601({ strict: true, strictSeparator: true })
  @ApiProperty()
  fechaHora: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  @ApiPropertyOptional()
  idPaciente?: number;
}
