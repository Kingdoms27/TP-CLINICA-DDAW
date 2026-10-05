import { HttpErrorResponse } from '@angular/common/http';

export function mensajeApi(error: unknown, fallback: string): string {
  if (!(error instanceof HttpErrorResponse)) return fallback;
  if (error.status === 0) return 'No se pudo conectar con el servidor. Intentá nuevamente.';
  if (error.status >= 500) return 'El servidor no pudo completar la solicitud. Intentá nuevamente.';
  const message: unknown = error.error?.message;
  if (typeof message === 'string') return message;
  if (Array.isArray(message) && message.every((item) => typeof item === 'string')) {
    return message.join(' ');
  }
  return fallback;
}
