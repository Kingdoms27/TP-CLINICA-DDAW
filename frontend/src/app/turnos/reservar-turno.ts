import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { mensajeApi } from '../shared/api-error';
import { fechaClinica, fechaMaxima, horarioValido, instanteConsulta } from './fechas-clinica';
import { MedicoDisponible, ReservaCreada, TurnosService } from './turnos.service';

@Component({
  selector: 'app-reservar-turno',
  imports: [FormsModule, RouterLink, CurrencyPipe, DatePipe],
  templateUrl: './reservar-turno.html',
  styleUrl: './reservar-turno.css',
})
export class ReservarTurno {
  private readonly servicio = inject(TurnosService);
  private readonly destroyRef = inject(DestroyRef);
  readonly medicos = signal<MedicoDisponible[]>([]);
  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly error = signal('');
  readonly errorMedicos = signal('');
  readonly reserva = signal<ReservaCreada | null>(null);
  idMedico: number | null = null;
  fecha = fechaClinica();
  hora = '';
  readonly horarios = Array.from({ length: 8 }, (_, i) => `${String(i + 8).padStart(2, '0')}:00`);

  get hoy(): string { return fechaClinica(); }
  get fechaLimite(): string { return fechaMaxima(); }
  get medicoSeleccionado(): MedicoDisponible | undefined { return this.medicos().find((m) => m.id === this.idMedico); }
  get horariosDisponibles(): string[] { return this.horarios.filter((hora) => horarioValido(this.fecha, hora)); }

  constructor() { this.cargarMedicos(); }

  cargarMedicos(): void {
    if (this.cargando()) return;
    this.cargando.set(true);
    this.errorMedicos.set('');
    this.servicio.listarMedicos().pipe(
      takeUntilDestroyed(this.destroyRef), finalize(() => this.cargando.set(false)),
    ).subscribe({
      next: (medicos) => this.medicos.set(medicos),
      error: (error: unknown) => this.errorMedicos.set(mensajeApi(error, 'No se pudieron cargar los médicos.')),
    });
  }

  reservar(form: NgForm): void {
    if (this.guardando() || this.reserva()) return;
    this.error.set('');
    if (form.invalid || !this.medicoSeleccionado || !horarioValido(this.fecha, this.hora)) {
      form.control.markAllAsTouched();
      this.error.set('Elegí un médico y un horario futuro válido, dentro de los próximos 30 días.');
      return;
    }
    this.guardando.set(true);
    this.servicio.reservar(this.idMedico!, instanteConsulta(this.fecha, this.hora).toISOString()).pipe(
      takeUntilDestroyed(this.destroyRef), finalize(() => this.guardando.set(false)),
    ).subscribe({
      next: (reserva) => this.reserva.set(reserva),
      error: (error: unknown) => this.error.set(mensajeApi(error, 'No se pudo reservar el turno.')),
    });
  }
}
