import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { NgForm } from '@angular/forms';
import { AgendaMedico } from './agenda-medico';
import { Administrador } from './administrador';
import { fechaClinica } from '../turnos/fechas-clinica';

const paciente={id:3,documento:'30000001',nombres:'Carlos',apellidos:'Lopez'};
const medico={id:1,matricula:1001,valorConsulta:15000,nombres:'Juan',apellidos:'Perez'};
const futuro=()=>`${fechaClinica(new Date(Date.now()+2*86400000))}T12:00:00.000Z`;
const turno=()=>({id:12,fechaHora:futuro(),estado:'ACTIVO' as const,valorConsulta:15000,paciente,medico});

describe('Áreas de médico y administrador',()=>{
  let http:HttpTestingController;
  beforeEach(()=>{TestBed.configureTestingModule({imports:[AgendaMedico,Administrador],providers:[provideHttpClient(),provideHttpClientTesting()]});http=TestBed.inject(HttpTestingController);});
  afterEach(()=>http.verify());
  async function admin(){
    const fixture=TestBed.createComponent(Administrador);
    http.expectOne('/api/reservas/admin').flush([turno()]);http.expectOne('/api/medicos').flush([medico]);http.expectOne('/api/usuarios/pacientes').flush([paciente]);
    await fixture.whenStable();return fixture;
  }
  it('el médico consulta por fecha y confirma el estado una sola vez',async()=>{
    const fixture=TestBed.createComponent(AgendaMedico);
    const request=http.expectOne(r=>r.url==='/api/reservas/medico');expect(request.request.params.get('fecha')).toBe(fechaClinica());request.flush([turno()]);
    await fixture.whenStable();expect(fixture.nativeElement.textContent).toContain('Carlos Lopez');
    fixture.nativeElement.querySelector('td .actions button').click();await fixture.whenStable();
    http.expectNone('/api/reservas/12/atendido');
    fixture.nativeElement.querySelector('.confirmation button').click();fixture.componentInstance.confirmar();
    http.expectOne('/api/reservas/12/atendido').flush({...turno(),estado:'ATENDIDO'});await fixture.whenStable();
    expect(fixture.componentInstance.turnos()[0].estado).toBe('ATENDIDO');
    expect(fixture.nativeElement.querySelector('td .actions')).toBeNull();
  });
  it('el médico puede marcar ausente y ve errores del servidor sin cambiar el turno',async()=>{
    const fixture=TestBed.createComponent(AgendaMedico);http.expectOne(r=>r.url==='/api/reservas/medico').flush([turno()]);await fixture.whenStable();
    fixture.componentInstance.seleccion.set({turno:fixture.componentInstance.turnos()[0],accion:'ausente'});fixture.componentInstance.confirmar();
    http.expectOne('/api/reservas/12/ausente').flush({message:'El turno ya fue modificado'},{status:400,statusText:'Bad Request'});await fixture.whenStable();
    expect(fixture.componentInstance.turnos()[0].estado).toBe('ACTIVO');expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('modificado');
  });
  it('el administrador cambia el precio sin modificar reservas existentes',async()=>{
    const fixture=await admin();const component=fixture.componentInstance;
    component.cambiarVista('precios');component.valores[1]=18000;component.actualizarPrecio(medico);
    const request=http.expectOne('/api/medicos/1/valor-consulta');expect(request.request.body).toEqual({valorConsulta:18000});request.flush({...medico,valorConsulta:18000});await fixture.whenStable();
    expect(component.medicos()[0].valorConsulta).toBe(18000);expect(component.turnos()[0].valorConsulta).toBe(15000);
    component.valores[1]=0;component.actualizarPrecio(component.medicos()[0]);http.expectNone('/api/medicos/1/valor-consulta');
  });
  it('el administrador reserva para el paciente elegido y envía los ids correctos',async()=>{
    const fixture=await admin();const component=fixture.componentInstance;component.cambiarVista('reservar');
    component.idPaciente=3;component.idMedico=1;component.fecha=fechaClinica(new Date(Date.now()+2*86400000));component.hora='09:00';
    component.reservar({invalid:false,control:{markAllAsTouched:()=>{}}} as unknown as NgForm);
    const request=http.expectOne('/api/reservas');expect(request.request.body).toEqual({idPaciente:3,idMedico:1,fechaHora:futuro()});
    request.flush({...turno(),id:13});await fixture.whenStable();expect(component.reservaConfirmada()?.id).toBe(13);expect(component.turnos()).toHaveLength(2);
  });
  it('el administrador puede cancelar antes del inicio y no después',async()=>{
    const fixture=await admin();const component=fixture.componentInstance;
    expect(component.puedeCancelar({...turno(),fechaHora:new Date(Date.now()-1000).toISOString()})).toBe(false);
    expect(component.puedeCancelar({...turno(),estado:'CANCELADO'})).toBe(false);
    component.seleccion.set(component.turnos()[0]);component.cancelar();
    http.expectOne('/api/reservas/12/cancelar-admin').flush({...turno(),estado:'CANCELADO'});await fixture.whenStable();expect(component.turnos()[0].estado).toBe('CANCELADO');
  });
  it('filtra por paciente, DNI y fecha',async()=>{
    const fixture=await admin();const component=fixture.componentInstance;
    component.busqueda='30000001';expect(component.turnosFiltrados).toHaveLength(1);
    component.busqueda='otro';expect(component.turnosFiltrados).toHaveLength(0);
    component.busqueda='';component.filtroFecha='2000-01-01';expect(component.turnosFiltrados).toHaveLength(0);
  });
});
