import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot } from '@angular/router';
import { AuthService } from './auth.service';
import { authInterceptor } from './auth.interceptor';
import { authGuard, guestGuard } from './auth.guards';
import { RolUsuario, Sesion } from './auth.models';

function respuesta(rol: RolUsuario = 'PACIENTE', exp = Math.floor(Date.now() / 1000) + 3600): Sesion {
  const payload = btoa(JSON.stringify({ sub: 3, rol, exp }));
  return {
    accessToken: `eyJhbGciOiJIUzI1NiJ9.${payload}.firma`,
    usuario: { id: 3, documento: '30000001', nombres: 'Carlos', apellidos: 'Lopez',
      email: 'paciente1@clinica.com', estado: 'ACTIVO', rol },
  };
}

describe('Autenticación', () => {
  let http: HttpTestingController;
  let auth: AuthService;
  let client: HttpClient;
  let router: Router;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting(), provideRouter([]),
    ] });
    http = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    client = TestBed.inject(HttpClient);
    router = TestBed.inject(Router);
  });
  afterEach(() => { http.verify(); sessionStorage.clear(); vi.restoreAllMocks(); });

  function ingresar(sesion = respuesta()) {
    auth.login(' paciente1@clinica.com ', 'Clinica123!').subscribe();
    const request = http.expectOne('/api/auth/login');
    expect(request.request.body).toEqual({ email: 'paciente1@clinica.com', clave: 'Clinica123!' });
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush(sesion);
    return sesion;
  }

  it.each([
    ['PACIENTE', '/paciente'], ['MEDICO', '/medico'], ['ADMINISTRADOR', '/administrador'],
  ] as const)('redirige %s a su área y conserva la sesión al recargar', (rol, ruta) => {
    const sesion = ingresar(respuesta(rol));
    expect(auth.rutaInicio()).toBe(ruta);
    const restaurada = TestBed.runInInjectionContext(() => new AuthService());
    expect(restaurada.obtenerToken()).toBe(sesion.accessToken);
    expect(sessionStorage.getItem('clinica.sesion')).not.toContain('Clinica123!');
  });

  it('rechaza credenciales incorrectas sin guardar sesión', () => {
    let status = 0;
    auth.login('paciente1@clinica.com', 'incorrecta').subscribe({ error: (e) => status = e.status });
    http.expectOne('/api/auth/login').flush({ message: 'Email o contraseña incorrectos' }, { status: 401, statusText: 'Unauthorized' });
    expect(status).toBe(401);
    expect(auth.sesion()).toBeNull();
    expect(sessionStorage.getItem('clinica.sesion')).toBeNull();
  });

  it.each(['sesión vencida', 'usuario inactivo', 'rol inválido'])('rechaza una respuesta con %s', (caso) => {
    const sesion = respuesta();
    if (caso === 'sesión vencida') sesion.accessToken = respuesta('PACIENTE', 1).accessToken;
    if (caso === 'usuario inactivo') (sesion.usuario as any).estado = 'BAJA';
    if (caso === 'rol inválido') (sesion.usuario as any).rol = 'OTRO';
    let rejected = false;
    auth.login('paciente1@clinica.com', 'Clinica123!').subscribe({ error: () => rejected = true });
    http.expectOne('/api/auth/login').flush(sesion);
    expect(rejected).toBe(true);
    expect(auth.sesion()).toBeNull();
  });

  it('adjunta Bearer solo a la API y conserva la sesión ante un 403', () => {
    const sesion = ingresar();
    client.get('/api/reservas/mis-turnos').subscribe({ error: () => {} });
    const request = http.expectOne('/api/reservas/mis-turnos');
    expect(request.request.headers.get('Authorization')).toBe(`Bearer ${sesion.accessToken}`);
    request.flush({}, { status: 403, statusText: 'Forbidden' });
    expect(auth.sesion()).not.toBeNull();
    client.get('https://example.com/data').subscribe();
    const externa = http.expectOne('https://example.com/data');
    expect(externa.request.headers.has('Authorization')).toBe(false);
    externa.flush({});
  });

  it('limpia una sesión rechazada por el servidor y vuelve al login', () => {
    ingresar();
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    client.get('/api/reservas/mis-turnos').subscribe({ error: () => {} });
    http.expectOne('/api/reservas/mis-turnos').flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(auth.sesion()).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login'], { queryParams: { sesion: 'vencida' } });
  });

  it('un 401 de una petición anterior no cierra una sesión nueva', () => {
    ingresar();
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    client.get('/api/reservas/mis-turnos').subscribe({ error: () => {} });
    const anterior = http.expectOne('/api/reservas/mis-turnos');
    const nueva = ingresar(respuesta('MEDICO'));
    anterior.flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(auth.obtenerToken()).toBe(nueva.accessToken);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('redirige al login sin sesión y evita entrar al área de otro rol', () => {
    const route = { data: { rol: 'MEDICO' } } as unknown as ActivatedRouteSnapshot;
    const state = {} as RouterStateSnapshot;
    expect(String(TestBed.runInInjectionContext(() => authGuard(route, state)))).toBe('/login');
    ingresar();
    expect(String(TestBed.runInInjectionContext(() => authGuard(route, state)))).toBe('/paciente');
    expect(String(TestBed.runInInjectionContext(() => guestGuard(route, state)))).toBe('/paciente');
    route.data = { rol: 'PACIENTE' };
    expect(TestBed.runInInjectionContext(() => authGuard(route, state))).toBe(true);
  });

  it('limpia tokens vencidos y datos dañados del almacenamiento', () => {
    sessionStorage.setItem('clinica.sesion', JSON.stringify(respuesta('PACIENTE', 1)));
    const vencida = TestBed.runInInjectionContext(() => new AuthService());
    expect(vencida.obtenerToken()).toBeNull();
    sessionStorage.setItem('clinica.sesion', '{');
    const dañada = TestBed.runInInjectionContext(() => new AuthService());
    expect(dañada.obtenerToken()).toBeNull();
    expect(sessionStorage.getItem('clinica.sesion')).toBeNull();
  });
});
