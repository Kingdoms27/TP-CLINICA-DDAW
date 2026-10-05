export const ZONA_CLINICA = 'America/Argentina/Buenos_Aires';

export function fechaClinica(fecha = new Date()): string {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_CLINICA, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(fecha);
  const parte = (tipo: string) => partes.find((item) => item.type === tipo)!.value;
  return `${parte('year')}-${parte('month')}-${parte('day')}`;
}

export function fechaMaxima(ahora = new Date()): string {
  const limite = new Date(ahora);
  limite.setUTCDate(limite.getUTCDate() + 30);
  return fechaClinica(limite);
}

export function instanteConsulta(fecha: string, hora: string): Date {
  return new Date(`${fecha}T${hora}:00-03:00`);
}

export function horarioValido(fecha: string, hora: string, ahora = new Date()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !/^(0[89]|1[0-5]):00$/.test(hora)) return false;
  const consulta = instanteConsulta(fecha, hora);
  const limite = new Date(ahora);
  limite.setUTCDate(limite.getUTCDate() + 30);
  return !Number.isNaN(consulta.getTime()) && fechaClinica(consulta) === fecha &&
    consulta > ahora && consulta <= limite;
}

export function puedeCancelarTurno(turno: { estado: string; fechaHora: string }, ahora = new Date()): boolean {
  const consulta = new Date(turno.fechaHora);
  return turno.estado === 'ACTIVO' && !Number.isNaN(consulta.getTime()) &&
    fechaClinica(consulta) > fechaClinica(ahora);
}
