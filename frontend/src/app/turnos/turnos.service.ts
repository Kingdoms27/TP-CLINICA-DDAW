import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

export interface TurnoPaciente {
  id: number;
  fechaHora: string;
  estado: 'ACTIVO' | 'CANCELADO' | 'ATENDIDO' | 'AUSENTE';
  valorConsulta: number;
  medico: { id: number; matricula: number; nombres: string; apellidos: string };
}

export interface MedicoDisponible {
  id: number;
  matricula: number;
  valorConsulta: number;
  nombres: string;
  apellidos: string;
}

export interface ReservaCreada {
  id: number;
  fechaHora: string;
  estado: TurnoPaciente['estado'];
  valorConsulta: number;
}

@Injectable({ providedIn: 'root' })
export class TurnosService {
  private readonly http = inject(HttpClient);

  listarMisTurnos() {
    return this.http.get<TurnoPaciente[]>('/api/reservas/mis-turnos');
  }

  listarMedicos() {
    return this.http.get<MedicoDisponible[]>('/api/medicos');
  }

  reservar(idMedico: number, fechaHora: string) {
    return this.http.post<ReservaCreada>('/api/reservas', { idMedico, fechaHora });
  }

  cancelar(id: number) {
    return this.http.patch<ReservaCreada>(`/api/reservas/${id}/cancelar`, {});
  }
}
