import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { MedicoDisponible, ReservaCreada, TurnoPaciente } from '../turnos/turnos.service';

export interface PacienteResumen { id: number; nombres: string; apellidos: string; documento?: string; email?: string; }
export interface TurnoGestion extends ReservaCreada { paciente: PacienteResumen; medico?: TurnoPaciente['medico']; }

@Injectable({providedIn: 'root'})
export class GestionService {
  private readonly http = inject(HttpClient);
  agenda(fecha: string) {return this.http.get<TurnoGestion[]>('/api/reservas/medico', {params: {fecha}});}
  turnosAdministrador() {return this.http.get<TurnoGestion[]>('/api/reservas/admin');}
  pacientes() {return this.http.get<PacienteResumen[]>('/api/usuarios/pacientes');}
  medicos() {return this.http.get<MedicoDisponible[]>('/api/medicos');}
  estado(id: number, estado: 'atendido' | 'ausente' | 'cancelar-admin') {
    return this.http.patch<TurnoGestion>(`/api/reservas/${id}/${estado}`, {});
  }
  precio(id: number, valorConsulta: number) {return this.http.patch<MedicoDisponible>(`/api/medicos/${id}/valor-consulta`, {valorConsulta});}
  reservar(idPaciente: number, idMedico: number, fechaHora: string) {
    return this.http.post<TurnoGestion>('/api/reservas', {idPaciente, idMedico, fechaHora});
  }
}
