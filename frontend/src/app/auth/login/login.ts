import { DOCUMENT } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { AuthService } from '../auth.service';
import { mensajeApi } from '../../shared/api-error';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);
  readonly sesionVencida = inject(ActivatedRoute).snapshot.queryParamMap.get('sesion') === 'vencida';
  readonly cargando = signal(false);
  readonly error = signal('');
  email = '';
  clave = '';
  mostrarClave = false;

  alternarClave() {
    this.mostrarClave = !this.mostrarClave;
  }

  irASeccion(seccion: HTMLElement) {
    const reducirMovimiento = this.document.defaultView?.matchMedia('(prefers-reduced-motion: reduce)').matches;
    seccion.scrollIntoView({behavior: reducirMovimiento ? 'instant' : 'smooth', block: 'start'});
    seccion.focus({preventScroll: true});
  }

  iniciarSesion(form: NgForm) {
    if (this.cargando()) return;
    this.error.set('');
    if (form.invalid) {
      form.control.markAllAsTouched();
      this.error.set('Ingresá un correo válido y tu contraseña.');
      return;
    }
    this.cargando.set(true);
    this.auth.login(this.email, this.clave).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.cargando.set(false)),
    ).subscribe({
      next: () => {
        this.clave = '';
        const ventana = this.document.defaultView;
        if (ventana && (ventana.scrollY || ventana.scrollX)) {
          ventana.scrollTo({top: 0, left: 0, behavior: 'instant'});
        }
        void this.router.navigateByUrl(this.auth.rutaInicio());
      },
      error: (error: unknown) => this.error.set(mensajeApi(error, 'No se pudo iniciar sesión.')),
    });
  }
}
