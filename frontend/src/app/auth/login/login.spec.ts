import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app.routes';
import { authInterceptor } from '../auth.interceptor';

describe('Formulario de login y navegación', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({providers: [
      provideRouter(routes), provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting(),
    ]});
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { http.verify(); sessionStorage.clear(); });

  async function completar(harness: RouterTestingHarness, clave: string) {
    const root = harness.routeNativeElement!;
    const email = root.querySelector('#email') as HTMLInputElement;
    const password = root.querySelector('#clave') as HTMLInputElement;
    email.value = 'paciente1@clinica.com'; email.dispatchEvent(new Event('input'));
    password.value = clave; password.dispatchEvent(new Event('input'));
    await harness.fixture.whenStable();
    root.querySelector('form')!.dispatchEvent(new Event('submit', {cancelable:true}));
    harness.detectChanges();
  }

  it('muestra el rechazo del servidor y permite volver a intentar', async () => {
    const harness = await RouterTestingHarness.create('/login');
    await completar(harness, 'incorrecta');
    const button = harness.routeNativeElement!.querySelector('.submit-button') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    http.expectOne('/api/auth/login').flush({message:'Email o contraseña incorrectos'}, {status:401, statusText:'Unauthorized'});
    await harness.fixture.whenStable();
    expect(harness.routeNativeElement!.querySelector('[role="alert"]')!.textContent).toContain('incorrectos');
    expect(button.disabled).toBe(false);
  });

  it('inicia sesión, navega al área paciente y consulta sus turnos con Bearer', async () => {
    const harness = await RouterTestingHarness.create('/paciente');
    expect(harness.routeNativeElement!.querySelector('h1')!.textContent).toContain('Bienvenido');
    await completar(harness, 'Clinica123!');
    const request = http.expectOne('/api/auth/login');
    const payload = btoa(JSON.stringify({sub:3, rol:'PACIENTE', exp:Math.floor(Date.now()/1000)+3600}));
    const token = `header.${payload}.firma`;
    request.flush({accessToken:token, usuario:{id:3, nombres:'Carlos', apellidos:'Lopez', estado:'ACTIVO', rol:'PACIENTE'}});
    await harness.fixture.whenStable();
    const turnos = http.expectOne('/api/reservas/mis-turnos');
    expect(turnos.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
    turnos.flush([]);
    await harness.fixture.whenStable();
    expect(harness.routeNativeElement!.textContent).toContain('Mis turnos');
    expect(harness.routeNativeElement!.textContent).toContain('Todavía no tenés turnos');
    const logout = Array.from(harness.routeNativeElement!.querySelectorAll('button')).find(b=>b.textContent?.includes('Cerrar sesión'))!;
    logout.click();
    await harness.fixture.whenStable();
    expect(harness.routeNativeElement!.querySelector('h1')!.textContent).toContain('Bienvenido');
    expect(sessionStorage.getItem('clinica.sesion')).toBeNull();
  });

  it('no envía una petición cuando faltan credenciales', async () => {
    const harness = await RouterTestingHarness.create('/login');
    harness.routeNativeElement!.querySelector('form')!.dispatchEvent(new Event('submit', {cancelable:true}));
    harness.detectChanges();
    http.expectNone('/api/auth/login');
    expect(harness.routeNativeElement!.querySelector('[role="alert"]')!.textContent).toContain('correo válido');
  });
});
