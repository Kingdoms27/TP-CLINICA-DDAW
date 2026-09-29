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
  email: string;

  @IsString()
  @IsNotEmpty({
    message: 'La contraseña es obligatoria',
  })
  clave: string;
}