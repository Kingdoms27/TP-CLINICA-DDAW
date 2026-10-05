import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { tap } from 'rxjs';
import { RUTAS_POR_ROL, Sesion } from './auth.models';

const SESSION_KEY = 'clinica.sesion';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly sesionActual = signal<Sesion | null>(this.restaurarSesion());
  readonly sesion = this.sesionActual.asReadonly();

  login(email: string, clave: string) {
    return this.http.post<Sesion>('/api/auth/login', { email: email.trim(), clave }).pipe(
      tap((sesion) => {
        if (!this.esSesionValida(sesion)) {
          throw new Error('La respuesta de inicio de sesión no es válida.');
        }
        // Una única entrada evita separar el token de su usuario.
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(sesion));
        this.sesionActual.set(sesion);
      }),
    );
  }

  obtenerToken(): string | null {
    const sesion = this.sesionActual();
    if (!sesion || !this.esSesionValida(sesion)) {
      this.logout();
      return null;
    }
    return sesion.accessToken;
  }

  rutaInicio(): string {
    return this.obtenerToken() ? RUTAS_POR_ROL[this.sesionActual()!.usuario.rol] : '/login';
  }

  logout(): void {
    this.sesionActual.set(null);
    try { sessionStorage.removeItem(SESSION_KEY); } catch { /* Almacenamiento bloqueado. */ }
  }

  private restaurarSesion(): Sesion | null {
    try {
      const sesion: unknown = JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? 'null');
      if (this.esSesionValida(sesion)) return sesion;
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // El almacenamiento puede estar bloqueado o contener datos dañados.
    }
    return null;
  }

  private esSesionValida(value: unknown): value is Sesion {
    if (!value || typeof value !== 'object') return false;
    const sesion = value as Sesion;
    const usuario = sesion.usuario;
    if (typeof sesion.accessToken !== 'string' || !usuario ||
        usuario.estado !== 'ACTIVO' ||
        !Object.prototype.hasOwnProperty.call(RUTAS_POR_ROL, usuario.rol) ||
        !Number.isInteger(usuario.id) || typeof usuario.nombres !== 'string' ||
        typeof usuario.apellidos !== 'string') return false;
    try {
      const partes = sesion.accessToken.split('.');
      if (partes.length !== 3) return false;
      const base64 = partes[1].replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')));
      // La firma y los permisos siempre los verifica el backend.
      return typeof payload.exp === 'number' && payload.exp * 1000 > Date.now() &&
        payload.sub === usuario.id && payload.rol === usuario.rol;
    } catch {
      return false;
    }
  }
}
