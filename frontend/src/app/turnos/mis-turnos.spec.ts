import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { fechaClinica } from './fechas-clinica';
import { MisTurnos } from './mis-turnos';

describe('Mis turnos', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [MisTurnos], providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])] });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  const futuro = () => `${fechaClinica(new Date(Date.now() + 2 * 86400000))}T12:00:00.000Z`;
  const turno = () => ({id: 12, fechaHora: futuro(), estado: 'ACTIVO', valorConsulta: 15000, medico: {id: 1, matricula: 1001, nombres: 'Juan', apellidos: 'Perez'}});


  it('destaca el turno futuro más cercano y excluye cancelados y reservas pasadas', async () => {
    const fixture = TestBed.createComponent(MisTurnos);
    const fecha = (dias: number) => new Date(Date.now() + dias * 86400000).toISOString();
    http.expectOne('/api/reservas/mis-turnos').flush([
      {...turno(), id: 1, fechaHora: fecha(4)},
      {...turno(), id: 2, fechaHora: fecha(-1)},
      {...turno(), id: 3, fechaHora: fecha(1), estado: 'CANCELADO'},
      {...turno(), id: 4, fechaHora: fecha(2)},
      {...turno(), id: 5, fechaHora: fecha(-2), estado: 'ATENDIDO'},
    ]);
    await fixture.whenStable();
    expect(fixture.componentInstance.proximosTurnos().map(t => t.id)).toEqual([4, 1]);
    expect(fixture.componentInstance.proximoTurno()?.id).toBe(4);
    expect(fixture.componentInstance.atendidos()).toBe(1);
    expect(fixture.componentInstance.turnos().map(t => t.id)).toEqual([1, 2, 3, 4, 5]);
  });

  it('actualiza el resumen y la próxima consulta cuando se cancela una reserva', async () => {
    const fixture = TestBed.createComponent(MisTurnos);
    http.expectOne('/api/reservas/mis-turnos').flush([turno()]);
    await fixture.whenStable();
    fixture.componentInstance.solicitarCancelacion(fixture.componentInstance.turnos()[0]);
    fixture.componentInstance.confirmarCancelacion();
    http.expectOne('/api/reservas/12/cancelar').flush({...turno(), estado: 'CANCELADO'});
    await fixture.whenStable();
    expect(fixture.componentInstance.proximosTurnos()).toEqual([]);
    expect(fixture.componentInstance.proximoTurno()).toBeNull();
    expect(fixture.nativeElement.querySelector('.next-empty')).not.toBeNull();
  });

  it('pide confirmación antes de cancelar y conserva el precio reservado', async () => {
    const fixture = TestBed.createComponent(MisTurnos);
    http.expectOne('/api/reservas/mis-turnos').flush([turno()]);
    await fixture.whenStable();
    fixture.nativeElement.querySelector('.cancel-button').click();
    http.expectNone('/api/reservas/12/cancelar');
    await fixture.whenStable();
    fixture.nativeElement.querySelector('.danger').click();
    fixture.componentInstance.confirmarCancelacion();
    const request = http.expectOne('/api/reservas/12/cancelar');
    expect(request.request.method).toBe('PATCH');
    request.flush({id:12, fechaHora:futuro(), estado:'CANCELADO', valorConsulta:15000});
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Tu turno se canceló correctamente');
    expect(fixture.nativeElement.textContent).toContain('Cancelado');
    expect(fixture.componentInstance.turnos()[0].valorConsulta).toBe(15000);
    expect(fixture.nativeElement.querySelector('.cancel-button')).toBeNull();
  });

  it('conservar turno no envía una cancelación', async () => {
    const fixture = TestBed.createComponent(MisTurnos);
    http.expectOne('/api/reservas/mis-turnos').flush([turno()]);
    await fixture.whenStable();
    fixture.nativeElement.querySelector('.cancel-button').click();
    await fixture.whenStable();
    fixture.nativeElement.querySelector('.confirmation-actions button:last-child').click();
    await fixture.whenStable();
    http.expectNone('/api/reservas/12/cancelar');
    expect(fixture.componentInstance.seleccion()).toBeNull();
  });

  it('un rechazo del servidor mantiene la reserva y permite reintentar', async () => {
    const fixture = TestBed.createComponent(MisTurnos);
    http.expectOne('/api/reservas/mis-turnos').flush([turno()]);
    await fixture.whenStable();
    fixture.componentInstance.solicitarCancelacion(fixture.componentInstance.turnos()[0]);
    fixture.componentInstance.confirmarCancelacion();
    http.expectOne('/api/reservas/12/cancelar').flush({message:'El turno solo puede cancelarse hasta el día anterior'}, {status:400,statusText:'Bad Request'});
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('día anterior');
    expect(fixture.componentInstance.turnos()[0].estado).toBe('ACTIVO');
    expect(fixture.componentInstance.cancelando()).toBe(false);
  });

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
