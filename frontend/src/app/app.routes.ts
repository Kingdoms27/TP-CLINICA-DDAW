import { Routes } from '@angular/router';
import { Login } from './auth/login/login';
import { authGuard, guestGuard } from './auth/auth.guards';
import { Area } from './areas/area';

export const routes: Routes = [
  {
    path: 'login',
    component: Login,
    canActivate: [guestGuard],
  },
  {
    path: 'paciente',
    component: Area,
    canActivate: [authGuard],
    data: { rol: 'PACIENTE' },
    children: [
      { path: '', loadComponent: () => import('./turnos/mis-turnos').then((m) => m.MisTurnos) },
      { path: 'reservar', loadComponent: () => import('./turnos/reservar-turno').then((m) => m.ReservarTurno) },
    ],
  },
  ...(['MEDICO', 'ADMINISTRADOR'] as const).map((rol) => ({
    path: rol === 'MEDICO' ? 'medico' : 'administrador',
    component: Area,
    canActivate: [authGuard],
    data: { rol },
    children: [{
      path: '',
      loadComponent: () => import('./areas/inicio-rol').then((m) => m.InicioRol),
      data: {
        titulo: rol === 'MEDICO' ? 'Área médico' : 'Área administrador',
        descripcion: rol === 'MEDICO'
          ? 'Acceso a la agenda de consultas y al registro de atención de pacientes.'
          : 'Acceso a la gestión de turnos y valores de consulta de los médicos.',
      },
    }],
  })),
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
