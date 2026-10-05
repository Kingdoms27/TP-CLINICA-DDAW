import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
} from 'class-validator';

export class LoginDto {
  @IsEmail({}, {
    message: 'El email no tiene un formato válido',
  })
  @IsNotEmpty({
    message: 'El email es obligatorio',
  })
  @ApiProperty()
  email: string;

  @IsString()
  @IsNotEmpty({
    message: 'La contraseña es obligatoria',
  })
  @ApiProperty()
  clave: string;
}