import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { mensajeApi } from '../shared/api-error';
import { TurnoPaciente, TurnosService } from './turnos.service';

@Component({
  selector: 'app-mis-turnos',
  imports: [DatePipe, CurrencyPipe],
  templateUrl: './mis-turnos.html',
  styleUrl: './mis-turnos.css',
})
export class MisTurnos {
  private readonly servicio = inject(TurnosService);
  private readonly destroyRef = inject(DestroyRef);
  readonly turnos = signal<TurnoPaciente[]>([]);
  readonly cargando = signal(false);
  readonly error = signal('');
  readonly estados = { ACTIVO: 'Reservado', CANCELADO: 'Cancelado', ATENDIDO: 'Atendido', AUSENTE: 'Ausente' };

  constructor() { this.cargar(); }

  cargar(): void {
    if (this.cargando()) return;
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
}
