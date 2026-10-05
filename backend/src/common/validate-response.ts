import { CallHandler, ExecutionContext, Injectable, InternalServerErrorException, Logger, NestInterceptor, SetMetadata, UseInterceptors, applyDecorators } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiResponse } from '@nestjs/swagger';
import { ClassConstructor, plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { mergeMap } from 'rxjs';

const RESPONSE_DTO = 'response-dto';

@Injectable()
export class ValidateResponseInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ValidateResponseInterceptor.name);
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const metadata = this.reflector.get<{type: ClassConstructor<object>; array: boolean}>(RESPONSE_DTO, context.getHandler());
    if (!metadata) return next.handle();
    return next.handle().pipe(mergeMap(async (value: unknown) => {
      if ((metadata.array && !Array.isArray(value)) || (!metadata.array && Array.isArray(value))) {
        throw new InternalServerErrorException('Respuesta inválida del servidor');
      }
      const items = metadata.array ? value as unknown[] : [value];
      const validado = await Promise.all(items.map(async (item) => {
        if (!item || typeof item !== 'object') throw new InternalServerErrorException('Respuesta inválida del servidor');
        const dto = plainToInstance(metadata.type, item);
        const errors = await validate(dto, {whitelist: true, forbidNonWhitelisted: true, forbidUnknownValues: true});
        if (errors.length) {
          this.logger.error(`Respuesta inválida de ${context.getHandler().name}: ${errors.map((e) => e.property).join(', ')}`);
          throw new InternalServerErrorException('Respuesta inválida del servidor');
        }
        return dto;
      }));
      return metadata.array ? validado : validado[0];
    }));
  }
}

export function ValidatedResponse(type: ClassConstructor<object>, array = false, status = 200) {
  return applyDecorators(SetMetadata(RESPONSE_DTO, {type, array}), UseInterceptors(ValidateResponseInterceptor),
    ApiResponse({status, type, isArray: array}));
}
