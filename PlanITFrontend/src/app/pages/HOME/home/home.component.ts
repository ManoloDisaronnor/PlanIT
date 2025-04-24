import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MenuComponent } from "../../../components/menu/menu.component";
import { HeaderComponent } from "../../../components/header/header.component";

@Component({
  selector: 'app-home',
  imports: [CommonModule, MenuComponent, HeaderComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  menuExpanded: boolean;

  constructor() {
    const menuState = localStorage.getItem('menuState');
    if (menuState) {
      this.menuExpanded = menuState === 'true';
    } else {
      localStorage.setItem('menuState', 'false');
      this.menuExpanded = false;
    }
  }
  
  toogleMenu(event: boolean) {
    this.menuExpanded = event;
  }
}
