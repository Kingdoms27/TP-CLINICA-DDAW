import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { mensajeApi } from '../shared/api-error';
import { fechaClinica } from '../turnos/fechas-clinica';
import { GestionService, TurnoGestion } from './gestion.service';

@Component({selector:'app-agenda-medico', imports:[FormsModule, DatePipe, CurrencyPipe], templateUrl:'./agenda-medico.html', styleUrl:'./gestion.css'})
export class AgendaMedico {
  private readonly servicio = inject(GestionService);
  private readonly destroyRef = inject(DestroyRef);
  fecha = fechaClinica();
  readonly turnos = signal<TurnoGestion[]>([]);
  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly error = signal('');
  readonly mensaje = signal('');
  readonly seleccion = signal<{turno: TurnoGestion; accion: 'atendido' | 'ausente'} | null>(null);
  constructor() {this.cargar();}

  cargar(): void {
    if (this.guardando() || this.cargando()) return;
    this.error.set(''); this.mensaje.set(''); this.seleccion.set(null); this.turnos.set([]);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(this.fecha)) {this.error.set('Seleccioná una fecha válida.'); return;}
    this.cargando.set(true);
    this.servicio.agenda(this.fecha).pipe(takeUntilDestroyed(this.destroyRef), finalize(()=>this.cargando.set(false)))
      .subscribe({next: turnos=>this.turnos.set(turnos), error: error=>this.error.set(mensajeApi(error,'No se pudo cargar la agenda.'))});
  }

  confirmar(): void {
    const seleccion = this.seleccion();
    if (!seleccion || this.guardando()) return;
    this.guardando.set(true); this.error.set('');
    this.servicio.estado(seleccion.turno.id,seleccion.accion).pipe(takeUntilDestroyed(this.destroyRef),finalize(()=>this.guardando.set(false)))
      .subscribe({next: actualizada=>{
        this.turnos.update(items=>items.map(item=>item.id===actualizada.id?{...item,...actualizada}:item));
        this.seleccion.set(null); this.mensaje.set('El estado del turno se actualizó correctamente.');
      },error: error=>this.error.set(mensajeApi(error,'No se pudo actualizar el turno.'))});
  }
}
