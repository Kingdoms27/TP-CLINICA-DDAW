import { Component } from '@angular/core';

@Component({
  selector: 'app-login',
  imports: [],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  mostrarClave = false;

  alternarClave() {
    this.mostrarClave = !this.mostrarClave;
  }

  iniciarSesion(event: Event) {
    event.preventDefault();
  }
}