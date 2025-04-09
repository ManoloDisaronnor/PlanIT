import { Component, OnInit } from '@angular/core';
import { Router, NavigationStart, NavigationEnd, NavigationCancel, NavigationError, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  // Título de la aplicación
  title = 'PlanITFrontend';
  constructor(private router: Router) { }

  ngOnInit() {
    // Ocultar pantalla de carga inicial cuando el componente raíz esté listo
    this.hideLoadingScreen();

    // Configurar lógica para mostrar/ocultar durante navegaciones
    this.router.events.pipe(
      filter(event =>
        event instanceof NavigationStart ||
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      )
    ).subscribe(event => {
      if (event instanceof NavigationStart) {
        this.showLoadingScreen();
      } else {
        // Pequeño retraso para asegurar que Angular ha renderizado
        setTimeout(() => {
          this.hideLoadingScreen();
        }, 100);
      }
    });
  }

  private hideLoadingScreen() {
    const loadingElement = document.getElementById('app-loading');
    if (loadingElement) {
      loadingElement.style.display = 'none';
    }
  }

  private showLoadingScreen() {
    const loadingElement = document.getElementById('app-loading');
    if (loadingElement) {
      loadingElement.style.display = 'flex';
    }
  }
}
