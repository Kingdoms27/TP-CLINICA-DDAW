import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NgForm } from '@angular/forms';
import { ReservarTurno } from './reservar-turno';
import { fechaClinica } from './fechas-clinica';

const medicos = [{id:1, matricula:1001, valorConsulta:15000, nombres:'Juan', apellidos:'Perez'}];
describe('Reservar turno', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({imports:[ReservarTurno],providers:[provideHttpClient(),provideHttpClientTesting(),provideRouter([])]});
    http=TestBed.inject(HttpTestingController);
  });
  afterEach(()=>http.verify());
  async function preparar() {
    const fixture=TestBed.createComponent(ReservarTurno);
    http.expectOne('/api/medicos').flush(medicos);
    await fixture.whenStable();
    return fixture;
  }
  async function completar(fixture: ComponentFixture<ReservarTurno>) {
    const root=fixture.nativeElement as HTMLElement;
    const medico=root.querySelector('#medico') as HTMLSelectElement;
    medico.selectedIndex=1; medico.dispatchEvent(new Event('change'));
    const fecha=root.querySelector('#fecha') as HTMLInputElement;
    fecha.value=fechaClinica(new Date(Date.now()+2*86400000)); fecha.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    const hora=root.querySelector('#hora') as HTMLSelectElement;
    hora.value='09:00'; hora.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    root.querySelector('form')!.dispatchEvent(new Event('submit',{cancelable:true}));
    fixture.detectChanges();
  }
  it('envía únicamente médico y fecha, evita duplicar el envío y muestra el precio confirmado', async()=>{
    const fixture=await preparar();
    await completar(fixture);
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit',{cancelable:true}));
    const request=http.expectOne('/api/reservas');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({idMedico:1,fechaHora:`${fixture.componentInstance.fecha}T12:00:00.000Z`});
    expect(fixture.componentInstance.guardando()).toBe(true);
    request.flush({id:10,fechaHora:request.request.body.fechaHora,estado:'ACTIVO',valorConsulta:18000});
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Tu turno quedó reservado');
    expect(fixture.nativeElement.textContent).toContain('18,000');
    expect(fixture.nativeElement.textContent).toContain('09:00');
  });
  it('muestra un horario ocupado y conserva los datos para corregir o reintentar', async()=>{
    const fixture=await preparar();
    await completar(fixture);
    http.expectOne('/api/reservas').flush({message:'El médico ya tiene un turno reservado en ese horario'},{status:400,statusText:'Bad Request'});
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('ya tiene un turno');
    expect(fixture.componentInstance.idMedico).toBe(1);
    expect(fixture.componentInstance.guardando()).toBe(false);
    expect(fixture.componentInstance.reserva()).toBeNull();
  });
  it('rechaza un turno fuera de rango antes de enviarlo al servidor', async()=>{
    const fixture=await preparar();
    fixture.componentInstance.idMedico=1;
    fixture.componentInstance.fecha=fechaClinica(new Date(Date.now()+31*86400000));
    fixture.componentInstance.hora='09:00';
    fixture.componentInstance.reservar({invalid:false,control:{markAllAsTouched:()=>{}}} as unknown as NgForm);
    http.expectNone('/api/reservas');
    expect(fixture.componentInstance.error()).toContain('30 días');
  });
  it('permite reintentar la carga del catálogo y comunica cuando está vacío', async()=>{
    const fixture=TestBed.createComponent(ReservarTurno);
    http.expectOne('/api/medicos').flush({},{status:503,statusText:'Unavailable'});
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
    fixture.nativeElement.querySelector('.message button').click();
    http.expectOne('/api/medicos').flush([]);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('No hay médicos disponibles');
  });
});
