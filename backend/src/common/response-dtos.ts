import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsEmail, IsEnum, IsInt, IsJWT, IsOptional, IsPositive, IsString, Min, ValidateNested } from 'class-validator';
import { EstadoUsuario } from './enums/estado-usuario.enum';
import { RolUsuario } from './enums/rol-usuario.enum';
import { EstadoReserva } from './enums/estado-reserva.enum';

export class PersonaResumenDto {
  @ApiProperty() @IsInt() @IsPositive() id: number;
  @ApiProperty() @IsString() nombres: string;
  @ApiProperty() @IsString() apellidos: string;
  @ApiPropertyOptional() @IsOptional() @IsString() documento?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
}

export class UsuarioSesionDto {
  @ApiProperty() @IsInt() @IsPositive() id: number;
  @ApiProperty() @IsString() nombres: string;
  @ApiProperty() @IsString() apellidos: string;
  @ApiProperty() @IsString() documento: string;
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty({ enum: EstadoUsuario }) @IsEnum(EstadoUsuario) estado: EstadoUsuario;
  @ApiProperty({ enum: RolUsuario }) @IsEnum(RolUsuario) rol: RolUsuario;
}

export class SesionRespuestaDto {
  @ApiProperty() @IsJWT() accessToken: string;
  @ApiProperty({type: () => UsuarioSesionDto}) @Type(() => UsuarioSesionDto) @ValidateNested() usuario: UsuarioSesionDto;
}

export class MedicoResumenDto {
  @ApiProperty() @IsInt() @IsPositive() id: number;
  @ApiProperty() @IsInt() @IsPositive() matricula: number;
  @ApiPropertyOptional() @IsOptional() @IsString() nombres?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() apellidos?: string;
}

export class MedicoConsultaDto {
  @ApiProperty() @IsInt() @IsPositive() id: number;
  @ApiProperty() @IsInt() @IsPositive() matricula: number;
  @ApiProperty() @IsString() nombres: string;
  @ApiProperty() @IsString() apellidos: string;
  @ApiProperty() @IsInt() @IsPositive() valorConsulta: number;
}

export class ReservaRespuestaDto {
  @ApiProperty() @IsInt() @IsPositive() id: number;
  @ApiProperty({type: String, format: 'date-time'}) @Type(() => Date) @IsDate() fechaHora: Date;
  @ApiProperty({enum: EstadoReserva}) @IsEnum(EstadoReserva) estado: EstadoReserva;
  @ApiProperty() @IsInt() @Min(1) valorConsulta: number;
  @ApiPropertyOptional({type: () => MedicoResumenDto}) @IsOptional() @Type(() => MedicoResumenDto) @ValidateNested() medico?: MedicoResumenDto;
  @ApiPropertyOptional({type: () => PersonaResumenDto}) @IsOptional() @Type(() => PersonaResumenDto) @ValidateNested() paciente?: PersonaResumenDto;
}
