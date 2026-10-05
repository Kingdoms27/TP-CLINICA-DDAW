import { CurrencyPipe, DatePipe, DOCUMENT } from '@angular/common';
import { afterNextRender, Component, computed, DestroyRef, ElementRef, inject, Injector, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { RouterLink } from '@angular/router';
import { mensajeApi } from '../shared/api-error';
import { TurnoPaciente, TurnosService } from './turnos.service';
import { puedeCancelarTurno } from './fechas-clinica';

@Component({
  selector: 'app-mis-turnos',
  imports: [DatePipe, CurrencyPipe, RouterLink],
  templateUrl: './mis-turnos.html',
  styleUrl: './mis-turnos.css',
})
export class MisTurnos {
  private readonly servicio = inject(TurnosService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private readonly confirmacion = viewChild<ElementRef<HTMLElement>>('confirmacion');
  readonly turnos = signal<TurnoPaciente[]>([]);
  readonly proximosTurnos = computed(() => {
    const ahora = Date.now();
    return this.turnos().filter(t => t.estado === 'ACTIVO' && new Date(t.fechaHora).getTime() > ahora)
      .sort((a, b) => new Date(a.fechaHora).getTime() - new Date(b.fechaHora).getTime());
  });
  readonly proximoTurno = computed(() => this.proximosTurnos()[0] ?? null);
  readonly atendidos = computed(() => this.turnos().filter(t => t.estado === 'ATENDIDO').length);
  readonly cargando = signal(false);
  readonly error = signal('');
  readonly seleccion = signal<TurnoPaciente | null>(null);
  readonly cancelando = signal(false);
  readonly errorCancelacion = signal('');
  readonly mensaje = signal('');
  readonly puedeCancelar = puedeCancelarTurno;
  readonly estados = { ACTIVO: 'Reservado', CANCELADO: 'Cancelado', ATENDIDO: 'Atendido', AUSENTE: 'Ausente' };

  constructor() { this.cargar(); }

  cargar(): void {
    if (this.cargando() || this.cancelando()) return;
    this.seleccion.set(null);
    this.cargando.set(true);
    this.error.set('');
    this.servicio.listarMisTurnos().pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.cargando.set(false)),
    ).subscribe({
      next: (turnos) => this.turnos.set(turnos),
      error: (error: unknown) => this.error.set(mensajeApi(error, 'No se pudieron cargar tus turnos.')),
    });
  }

  solicitarCancelacion(turno: TurnoPaciente): void {
    if (this.cancelando() || !this.puedeCancelar(turno)) return;
    this.errorCancelacion.set('');
    this.mensaje.set('');
    this.seleccion.set(turno);
    afterNextRender(() => {
      const panel = this.confirmacion()?.nativeElement;
      if (panel) this.irASeccion(panel);
    }, {injector: this.injector});
  }

  irASeccion(seccion: HTMLElement): void {
    const reducirMovimiento = this.document.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    seccion.scrollIntoView?.({behavior: reducirMovimiento ? 'instant' : 'smooth', block: 'start'});
    seccion.focus({preventScroll: true});
  }

  confirmarCancelacion(): void {
    const turno = this.seleccion();
    if (!turno || this.cancelando()) return;
    if (!this.puedeCancelar(turno)) {
      this.errorCancelacion.set('El turno solo puede cancelarse hasta el día anterior a la consulta.');
      this.seleccion.set(null);
      return;
    }
    this.cancelando.set(true);
    this.errorCancelacion.set('');
    this.servicio.cancelar(turno.id).pipe(
      takeUntilDestroyed(this.destroyRef), finalize(() => this.cancelando.set(false)),
    ).subscribe({
      next: (cancelada) => {
        this.turnos.update((items) => items.map((item) => item.id === turno.id ? { ...item, ...cancelada } : item));
        this.seleccion.set(null);
        this.mensaje.set('Tu turno se canceló correctamente.');
      },
      error: (error: unknown) => this.errorCancelacion.set(mensajeApi(error, 'No se pudo cancelar el turno.')),
    });
  }
}
