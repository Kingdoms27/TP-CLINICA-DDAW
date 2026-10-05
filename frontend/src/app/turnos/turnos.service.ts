import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

export interface TurnoPaciente {
  id: number;
  fechaHora: string;
  estado: 'ACTIVO' | 'CANCELADO' | 'ATENDIDO' | 'AUSENTE';
  valorConsulta: number;
  medico: { id: number; matricula: number; nombres: string; apellidos: string };
}

@Injectable({ providedIn: 'root' })
export class TurnosService {
  private readonly http = inject(HttpClient);

  listarMisTurnos() {
    return this.http.get<TurnoPaciente[]>('/api/reservas/mis-turnos');
  }
}
