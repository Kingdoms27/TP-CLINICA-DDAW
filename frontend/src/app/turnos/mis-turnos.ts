import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
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
  readonly turnos = signal<TurnoPaciente[]>([]);
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
