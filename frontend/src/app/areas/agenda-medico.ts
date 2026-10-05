import { CurrencyPipe, DatePipe, DOCUMENT } from '@angular/common';
import { afterNextRender, Component, computed, DestroyRef, ElementRef, inject, Injector, signal, viewChild } from '@angular/core';
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
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private readonly confirmacion = viewChild<ElementRef<HTMLElement>>('confirmacion');
  fecha = fechaClinica();
  readonly turnos = signal<TurnoGestion[]>([]);
  readonly fechaConsultada = signal(this.fecha);
  readonly resumen = computed(() => ({
    reservados: this.turnos().filter(t => t.estado === 'ACTIVO').length,
    atendidos: this.turnos().filter(t => t.estado === 'ATENDIDO').length,
    ausentes: this.turnos().filter(t => t.estado === 'AUSENTE').length,
  }));
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
    const fecha = this.fecha;
    this.servicio.agenda(fecha).pipe(takeUntilDestroyed(this.destroyRef), finalize(()=>this.cargando.set(false)))
      .subscribe({next: turnos=>{this.turnos.set(turnos);this.fechaConsultada.set(fecha);}, error: error=>this.error.set(mensajeApi(error,'No se pudo cargar la agenda.'))});
  }

  seleccionarEstado(turno: TurnoGestion, accion: 'atendido' | 'ausente'): void {
    if (this.guardando()) return;
    this.seleccion.set({turno, accion});
    afterNextRender(() => {
      const panel = this.confirmacion()?.nativeElement;
      const reducir = this.document.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      panel?.scrollIntoView?.({behavior: reducir ? 'instant' : 'smooth', block: 'start'});
      panel?.focus({preventScroll: true});
    }, {injector: this.injector});
  }

  confirmar(): void {
    const seleccion = this.seleccion();
    if (!seleccion || this.guardando()) return;
    this.guardando.set(true); this.error.set('');
    this.servicio.estado(seleccion.turno.id,seleccion.accion).pipe(takeUntilDestroyed(this.destroyRef),finalize(()=>this.guardando.set(false)))
      .subscribe({next: actualizada=>{
        this.turnos.update(items=>items.map(item=>item.id===actualizada.id?{...item,...actualizada,paciente:{...item.paciente,...actualizada.paciente}}:item));
        this.seleccion.set(null); this.mensaje.set('El estado del turno se actualizó correctamente.');
      },error: error=>this.error.set(mensajeApi(error,'No se pudo actualizar el turno.'))});
  }
}
