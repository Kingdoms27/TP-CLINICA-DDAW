import { CurrencyPipe, DatePipe, DOCUMENT } from '@angular/common';
import { afterNextRender, Component, DestroyRef, ElementRef, inject, Injector, signal, viewChild } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, forkJoin } from 'rxjs';
import { mensajeApi } from '../shared/api-error';
import { fechaClinica, fechaMaxima, horarioValido, instanteConsulta } from '../turnos/fechas-clinica';
import { MedicoDisponible } from '../turnos/turnos.service';
import { GestionService, PacienteResumen, TurnoGestion } from './gestion.service';

@Component({selector:'app-administrador', imports:[FormsModule,DatePipe,CurrencyPipe], templateUrl:'./administrador.html',styleUrl:'./gestion.css'})
export class Administrador {
  private readonly servicio=inject(GestionService);
  private readonly destroyRef=inject(DestroyRef);
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private readonly confirmacion = viewChild<ElementRef<HTMLElement>>('confirmacion');
  readonly vista=signal<'turnos'|'reservar'|'precios'>('turnos');
  readonly turnos=signal<TurnoGestion[]>([]);
  readonly medicos=signal<MedicoDisponible[]>([]);
  readonly pacientes=signal<PacienteResumen[]>([]);
  readonly cargando=signal(false);
  readonly guardando=signal(false);
  readonly error=signal('');
  readonly mensaje=signal('');
  readonly seleccion=signal<TurnoGestion|null>(null);
  readonly reservaConfirmada=signal<TurnoGestion|null>(null);
  valores: Record<number,number>={};
  filtroFecha=''; busqueda=''; idPaciente:number|null=null; idMedico:number|null=null;
  fecha=fechaClinica(); hora='';
  readonly horarios=Array.from({length:8},(_,i)=>`${String(i+8).padStart(2,'0')}:00`);
  get hoy() {return fechaClinica();}
  get limite() {return fechaMaxima();}
  get horariosDisponibles() {return this.horarios.filter(h=>horarioValido(this.fecha,h));}
  get medicoSeleccionado() {return this.medicos().find(m=>m.id===this.idMedico);}
  get turnosFiltrados() {
    const busqueda=this.busqueda.trim().toLowerCase();
    return this.turnos().filter(turno=>(!this.filtroFecha || fechaClinica(new Date(turno.fechaHora))===this.filtroFecha) &&
      (!busqueda || `${turno.paciente.nombres} ${turno.paciente.apellidos} ${turno.paciente.documento??''} ${turno.medico?.nombres??''} ${turno.medico?.apellidos??''}`.toLowerCase().includes(busqueda)));
  }
  constructor() {this.cargar();}
  cambiarVista(vista:'turnos'|'reservar'|'precios'): void {
    if(this.guardando()) return;
    this.vista.set(vista);this.error.set('');this.mensaje.set('');this.seleccion.set(null);
    if(vista==='reservar') this.reservaConfirmada.set(null);
  }
  cargar(): void {
    if(this.cargando()||this.guardando()) return;
    this.cargando.set(true);this.error.set('');
    forkJoin({turnos:this.servicio.turnosAdministrador(),medicos:this.servicio.medicos(),pacientes:this.servicio.pacientes()})
      .pipe(takeUntilDestroyed(this.destroyRef),finalize(()=>this.cargando.set(false)))
      .subscribe({next:datos=>{
        this.turnos.set(datos.turnos);this.medicos.set(datos.medicos);this.pacientes.set(datos.pacientes);
        this.valores=Object.fromEntries(datos.medicos.map(m=>[m.id,m.valorConsulta]));
      },error:error=>this.error.set(mensajeApi(error,'No se pudieron cargar los datos.'))});
  }
  puedeCancelar(turno:TurnoGestion): boolean {
    return turno.estado==='ACTIVO'&&new Date(turno.fechaHora).getTime()>Date.now();
  }
  seleccionarCancelacion(turno: TurnoGestion): void {
    if (this.guardando()) return;
    this.seleccion.set(turno);
    afterNextRender(() => {
      const panel = this.confirmacion()?.nativeElement;
      const reducir = this.document.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      panel?.scrollIntoView?.({behavior: reducir ? 'instant' : 'smooth', block: 'start'});
      panel?.focus({preventScroll: true});
    }, {injector: this.injector});
  }

  cancelar():void {
    const turno=this.seleccion();if(!turno||this.guardando()) return;
    if(!this.puedeCancelar(turno)){this.error.set('No se puede cancelar un turno que ya comenzó.');this.seleccion.set(null);return;}
    this.guardando.set(true);this.error.set('');
    this.servicio.estado(turno.id,'cancelar-admin').pipe(takeUntilDestroyed(this.destroyRef),finalize(()=>this.guardando.set(false)))
      .subscribe({next:actualizada=>{
        this.turnos.update(items=>items.map(item=>item.id===turno.id?{...item,...actualizada,paciente:{...item.paciente,...actualizada.paciente}}:item));
        this.seleccion.set(null);this.mensaje.set('El turno se canceló correctamente.');
      },error:error=>this.error.set(mensajeApi(error,'No se pudo cancelar el turno.'))});
  }
  reservar(form:NgForm):void {
    if(this.guardando()||this.reservaConfirmada()) return;
    this.error.set('');this.mensaje.set('');
    if(form.invalid||!this.medicoSeleccionado||!this.pacientes().some(p=>p.id===this.idPaciente)||!horarioValido(this.fecha,this.hora)) {
      form.control.markAllAsTouched();this.error.set('Elegí paciente, médico y un horario válido dentro de los próximos 30 días.');return;
    }
    this.guardando.set(true);
    this.servicio.reservar(this.idPaciente!,this.idMedico!,instanteConsulta(this.fecha,this.hora).toISOString())
      .pipe(takeUntilDestroyed(this.destroyRef),finalize(()=>this.guardando.set(false)))
      .subscribe({next:reserva=>{
        this.reservaConfirmada.set(reserva);
        const medico=this.medicoSeleccionado!; const paciente=this.pacientes().find(p=>p.id===this.idPaciente)!;
        this.turnos.update(items=>[...items,{...reserva,medico:{id:medico.id,matricula:medico.matricula,nombres:medico.nombres,apellidos:medico.apellidos},paciente}].sort((a,b)=>a.fechaHora.localeCompare(b.fechaHora)));
      },error:error=>this.error.set(mensajeApi(error,'No se pudo reservar el turno.'))});
  }
  actualizarPrecio(medico:MedicoDisponible):void {
    if(this.guardando()) return;
    const valor=this.valores[medico.id];this.error.set('');this.mensaje.set('');
    if(!Number.isInteger(valor)||valor<=0){this.error.set('El valor de consulta debe ser un entero mayor a cero.');return;}
    this.guardando.set(true);
    this.servicio.precio(medico.id,valor).pipe(takeUntilDestroyed(this.destroyRef),finalize(()=>this.guardando.set(false)))
      .subscribe({next:actualizado=>{
        this.medicos.update(items=>items.map(item=>item.id===medico.id?actualizado:item));
        this.valores[medico.id]=actualizado.valorConsulta;
        this.mensaje.set('Valor actualizado. Las reservas anteriores conservan su precio.');
      },error:error=>this.error.set(mensajeApi(error,'No se pudo actualizar el valor.'))});
  }
}
