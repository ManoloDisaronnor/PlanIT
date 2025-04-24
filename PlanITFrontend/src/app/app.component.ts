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
  title = 'PlanITFrontend';
  // NOTE TODA LA LOGICA DE LA CARGA ESTA EN EL SEVICIO, PERO ES NECESARIO TENERLO AQUI TAMBIEN PARA EL COMPONENTE NOTFOUND SI NO CARGA INFINITO
  constructor(private router: Router) { }

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
