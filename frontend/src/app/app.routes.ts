import { Routes } from '@angular/router';
import { Login } from './auth/login/login';
import { authGuard, guestGuard } from './auth/auth.guards';
import { Area } from './areas/area';

export const routes: Routes = [
  {path:'login', component:Login, canActivate:[guestGuard]},
  {
    path:'paciente', component:Area, canActivate:[authGuard], data:{rol:'PACIENTE'},
    children:[
      {path:'', loadComponent:()=>import('./turnos/mis-turnos').then(m=>m.MisTurnos)},
      {path:'reservar', loadComponent:()=>import('./turnos/reservar-turno').then(m=>m.ReservarTurno)},
    ],
  },
  {
    path:'medico', component:Area, canActivate:[authGuard], data:{rol:'MEDICO'},
    children:[{path:'', loadComponent:()=>import('./areas/agenda-medico').then(m=>m.AgendaMedico)}],
  },
  {
    path:'administrador', component:Area, canActivate:[authGuard], data:{rol:'ADMINISTRADOR'},
    children:[{path:'', loadComponent:()=>import('./areas/administrador').then(m=>m.Administrador)}],
  },
  {path:'',redirectTo:'login',pathMatch:'full'},
  {path:'**',redirectTo:'login'},
];
