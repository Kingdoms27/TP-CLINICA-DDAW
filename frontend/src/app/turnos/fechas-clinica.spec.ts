import { fechaClinica, fechaMaxima, horarioValido, puedeCancelarTurno } from './fechas-clinica';

describe('Reglas de fechas y horarios de la clínica', () => {
  const ahora = new Date('2026-10-05T13:30:00-03:00');
  it('usa el día de Argentina incluso cerca de la medianoche UTC', () => {
    expect(fechaClinica(new Date('2026-10-06T01:00:00Z'))).toBe('2026-10-05');
    expect(fechaMaxima(ahora)).toBe('2026-11-04');
  });
  it('admite desde 08:00 hasta 15:00 y rechaza minutos y horarios pasados', () => {
    expect(horarioValido('2026-10-06', '08:00', ahora)).toBe(true);
    expect(horarioValido('2026-10-06', '15:00', ahora)).toBe(true);
    expect(horarioValido('2026-10-06', '16:00', ahora)).toBe(false);
    expect(horarioValido('2026-10-06', '09:30', ahora)).toBe(false);
    expect(horarioValido('2026-10-05', '13:00', ahora)).toBe(false);
    expect(horarioValido('2026-10-05', '14:00', ahora)).toBe(true);
    expect(horarioValido('2026-02-30', '09:00', ahora)).toBe(false);
  });
  it('aplica el límite exacto de 30 días y permite cruzar mes y año', () => {
    expect(horarioValido('2026-11-04', '13:00', ahora)).toBe(true);
    expect(horarioValido('2026-11-04', '14:00', ahora)).toBe(false);
    expect(horarioValido('2026-11-05', '09:00', ahora)).toBe(false);
    expect(fechaMaxima(new Date('2026-12-20T10:00:00-03:00'))).toBe('2027-01-19');
  });
  it('solo permite cancelar turnos activos desde el día anterior hacia atrás', () => {
    const turno = {estado:'ACTIVO', fechaHora:'2026-10-06T08:00:00-03:00'};
    expect(puedeCancelarTurno(turno, ahora)).toBe(true);
    expect(puedeCancelarTurno(turno, new Date('2026-10-06T00:00:00-03:00'))).toBe(false);
    expect(puedeCancelarTurno({...turno,estado:'CANCELADO'}, ahora)).toBe(false);
    expect(puedeCancelarTurno({...turno,estado:'ATENDIDO'}, ahora)).toBe(false);
    expect(puedeCancelarTurno({...turno,estado:'AUSENTE'}, ahora)).toBe(false);
  });
});
