import {
  IsNotEmpty,
  Matches,
} from 'class-validator';

export class ListarTurnosMedicoDto {
  @IsNotEmpty()
  @Matches(
    /^\d{4}-\d{2}-\d{2}$/,
    {
      message:
        'La fecha debe tener formato YYYY-MM-DD',
    },
  )
  fecha: string;
}