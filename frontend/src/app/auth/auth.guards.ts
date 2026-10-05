import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { RolUsuario } from './auth.models';

export const authGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.obtenerToken()) return router.parseUrl('/login');
  const rolPermitido = route.data['rol'] as RolUsuario;
  return auth.sesion()!.usuario.rol === rolPermitido
    ? true
    : router.parseUrl(auth.rutaInicio());
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.obtenerToken() ? inject(Router).parseUrl(auth.rutaInicio()) : true;
};
