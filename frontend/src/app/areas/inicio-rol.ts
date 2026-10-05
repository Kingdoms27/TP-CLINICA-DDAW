import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-inicio-rol',
  template: `
    <p class="eyebrow">GESTIÓN CLÍNICA</p>
    <h1>{{ titulo }}</h1>
    <p class="description">{{ descripcion }}</p>
    <p class="pending">Las operaciones de esta área se incorporarán en la siguiente etapa.</p>
  `,
  styles: `
    .eyebrow { font-size: 11px; letter-spacing: .15em; color: #77766f; margin-bottom: 16px; }
    h1 { font-size: clamp(30px, 4vw, 44px); letter-spacing: -.04em; margin-bottom: 18px; }
    .description, .pending { font-size: 15px; line-height: 1.7; max-width: 650px; }
    .pending { margin-top: 32px; color: #77766f; }
  `,
})
export class InicioRol {
  private readonly data = inject(ActivatedRoute).snapshot.data;
  readonly titulo = this.data['titulo'] as string;
  readonly descripcion = this.data['descripcion'] as string;
}
