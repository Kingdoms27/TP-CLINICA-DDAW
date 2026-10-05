import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  // No enviar credenciales a URLs externas ni al endpoint de login.
  if (!request.url.startsWith('/api/') || request.url === '/api/auth/login') {
    return next(request);
  }
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.obtenerToken();
  const autenticada = token
    ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : request;

  return next(autenticada).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 &&
          (!auth.sesion() || auth.sesion()?.accessToken === token)) {
        auth.logout();
        void router.navigate(['/login'], { queryParams: { sesion: 'vencida' } });
      }
      return throwError(() => error);
    }),
  );
};
