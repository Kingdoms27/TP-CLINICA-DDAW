import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  Matches,
  IsISO8601,
} from 'class-validator';

export class ListarTurnosMedicoDto {
  @IsISO8601({strict: true})
  @IsNotEmpty()
  @Matches(
    /^\d{4}-\d{2}-\d{2}$/,
    {
      message:
        'La fecha debe tener formato YYYY-MM-DD',
    },
  )
  @ApiProperty()
  fecha: string;
}