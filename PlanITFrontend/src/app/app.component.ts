import { Component, OnInit } from '@angular/core';
import { Router, NavigationStart, NavigationEnd, NavigationCancel, NavigationError, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';

/**
 * Componente raíz de la aplicación PlanIT
 * Maneja la navegación global y las pantallas de carga entre rutas
 * Centraliza la lógica de carga y proporciona la estructura base de la aplicación
 * 
 * @class AppComponent
 * @implements {OnInit}
 * @since 1.0.0
 * @author Manuel Santos Márquez
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {  /** Título de la aplicación */
  title = 'PlanITFrontend';
  
  /**
   * Constructor del componente principal
   * Nota: Toda la lógica de carga está en el servicio, pero es necesario tenerlo aquí 
   * también para el componente NotFound para evitar carga infinita
   * 
   * @param {Router} router - Servicio de enrutamiento de Angular
   */
  constructor(private router: Router) { }

  /**
   * Inicialización del componente
   * Configura la pantalla de carga inicial y listeners de navegación
   */
  ngOnInit() {
    this.hideLoadingScreen();
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
        setTimeout(() => {
          this.hideLoadingScreen();
        }, 100);
      }
    });
  }
  /**
   * Oculta la pantalla de carga de la aplicación
   * Manipula directamente el DOM para ocultar el elemento de carga
   * 
   * @private
   */
  private hideLoadingScreen() {
    const loadingElement = document.getElementById('app-loading');
    if (loadingElement) {
      loadingElement.style.display = 'none';
    }
  }

  /**
   * Muestra la pantalla de carga de la aplicación
   * Manipula directamente el DOM para mostrar el elemento de carga durante navegación
   * 
   * @private
   */
  private showLoadingScreen() {
    const loadingElement = document.getElementById('app-loading');
    if (loadingElement) {
      loadingElement.style.display = 'flex';
    }
  }
}
