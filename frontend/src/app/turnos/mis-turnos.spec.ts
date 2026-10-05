import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MisTurnos } from './mis-turnos';

describe('Mis turnos', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [MisTurnos], providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('muestra médico, fecha, estado y el precio reservado', async () => {
    const fixture = TestBed.createComponent(MisTurnos);
    http.expectOne('/api/reservas/mis-turnos').flush([{
      id: 1, fechaHora: '2026-10-06T10:00:00', estado: 'ACTIVO', valorConsulta: 15000,
      medico: { id: 1, matricula: 1001, nombres: 'Juan', apellidos: 'Perez' },
    }]);
    await fixture.whenStable();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Juan Perez');
    expect(text).toContain('06/10/2026');
    expect(text).toContain('Reservado');
    expect(text).toContain('15,000');
  });

  it('permite reintentar luego de un error y muestra el estado vacío', async () => {
    const fixture = TestBed.createComponent(MisTurnos);
    http.expectOne('/api/reservas/mis-turnos').flush({}, { status: 503, statusText: 'Unavailable' });
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
    fixture.nativeElement.querySelector('.error button').click();
    http.expectOne('/api/reservas/mis-turnos').flush([]);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Todavía no tenés turnos');
  });
});
