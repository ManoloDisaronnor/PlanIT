import { Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MenuComponent } from "../../../components/menu/menu.component";
import { HeaderComponent } from "../../../components/header/header.component";
import { Router, RouterOutlet } from '@angular/router';
import { FriendsComponent } from '../COMPONENTS/friends/friends.component';
import { InformationComponent } from '../COMPONENTS/information/information.component';
import { NotificationsComponent } from '../COMPONENTS/notifications/notifications.component';

/**
 * Componente principal de la página de inicio
 * Actúa como layout principal que contiene el menú, header y área de contenido
 * Gestiona la visibilidad de menús laterales y navegación
 * 
 * @class HomeComponent
 * @since 1.0.0
 * @author Manuel Santos Márquez
 */
@Component({
  selector: 'app-home',
  imports: [CommonModule, MenuComponent, HeaderComponent, RouterOutlet, FriendsComponent, InformationComponent, NotificationsComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {  /** Estado de expansión del menú principal */
  menuExpanded: boolean = false;
  /** Referencia al menú de amigos */
  @ViewChild('friendsMenu') friendsMenuRef?: ElementRef;
  /** Referencia al menú de información */
  @ViewChild('informationMenu') informationMenuRef?: ElementRef;
  /** Referencia al menú de notificaciones */
  @ViewChild('notificationsMenu') notificationsMenuRef?: ElementRef;
  /** Estado de expansión del menú de amigos */
  friendsMenuExpanded: boolean = false;
  /** Estado de expansión del menú de información */
  informationMenuExpanded: boolean = false;
  /** Estado de expansión del menú de notificaciones */
  notificationsMenuExpanded: boolean = false;

  constructor(public router: Router) {}

  /**
   * Listener para cerrar menús al hacer clic fuera de ellos
   * Maneja la lógica de cierre automático de menús desplegables
   * 
   * @param {HTMLElement} target - Elemento que fue clickeado
   */
  @HostListener('document:click', ['$event.target'])
  onClick(target: HTMLElement) {
    if (this.friendsMenuExpanded
      && this.friendsMenuRef
      && !this.friendsMenuRef.nativeElement.contains(target)) {
      this.friendsMenuExpanded = false;
    }
    if (this.informationMenuExpanded
      && this.informationMenuRef
      && !this.informationMenuRef.nativeElement.contains(target)) {
      this.informationMenuExpanded = false;
    }
    if (this.notificationsMenuExpanded
      && this.notificationsMenuRef
      && !this.notificationsMenuRef.nativeElement.contains(target)) {
      this.notificationsMenuExpanded = false;
    }
  }
  /**
   * Alterna el estado del menú principal
   * 
   * @param {boolean} event - Nuevo estado del menú
   */
  toogleMenu(event: boolean) {
    this.menuExpanded = event;
  }

  /**
   * Alterna el estado del menú lateral
   * 
   * @param {boolean} event - Nuevo estado del menú lateral
   */
  toggleLateralMenu(event: boolean) {
    this.menuExpanded = event;
  }

  toggleFriendsMenu(event: boolean) {
    this.friendsMenuExpanded = event;
    this.informationMenuExpanded = false;
    this.notificationsMenuExpanded = false;
  }

  toggleInformationMenu(event: boolean) {
    this.informationMenuExpanded = event;
    this.friendsMenuExpanded = false;
    this.notificationsMenuExpanded = false;
  }
  toggleNotificationsMenu(event: boolean) {
    this.notificationsMenuExpanded = event;
    this.friendsMenuExpanded = false;
    this.informationMenuExpanded = false;
  }

  closeInformationModal() {
    this.informationMenuExpanded = false;
  }
}
