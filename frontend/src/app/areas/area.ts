import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-area',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './area.html',
  styleUrl: './area.css',
})
export class Area {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly etiquetas = { PACIENTE: 'Paciente', MEDICO: 'Médico', ADMINISTRADOR: 'Administrador' };

  cerrarSesion(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }
}
