export type RolUsuario = 'PACIENTE' | 'MEDICO' | 'ADMINISTRADOR';

export interface UsuarioAutenticado {
  id: number;
  documento: string;
  nombres: string;
  apellidos: string;
  email: string;
  estado: 'ACTIVO';
  rol: RolUsuario;
}

export interface Sesion {
  accessToken: string;
  usuario: UsuarioAutenticado;
}

export const RUTAS_POR_ROL: Record<RolUsuario, string> = {
  PACIENTE: '/paciente',
  MEDICO: '/medico',
  ADMINISTRADOR: '/administrador',
};
