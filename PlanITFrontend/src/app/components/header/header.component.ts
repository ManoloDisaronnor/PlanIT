import { Component, EventEmitter, HostListener, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { getCurrentUser, logOut, setSessionStorage } from '../../../../config/authUser';
import { apiUrl } from '../../../../config/config';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { NotificationService } from '../../../../services/notification.service';
import { Subscription } from 'rxjs';

/**
 * Componente de cabecera de la aplicación
 * Contiene navegación, información del usuario, notificaciones y menús
 * Responsive y adaptado para dispositivos móviles y escritorio
 * 
 * @class HeaderComponent
 * @implements {OnInit, OnDestroy}
 * @since 1.0.0
 * @author Manuel Santos Márquez
 */
@Component({
  selector: 'app-header',
  imports: [MatIconModule, CommonModule, RouterModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent implements OnInit, OnDestroy {
  /** Evento para alternar el menú lateral */
  @Output() toggleLateralMenu: EventEmitter<boolean> = new EventEmitter<boolean>();
  /** Evento para alternar el menú de amigos */
  @Output() toggleFriendsMenu: EventEmitter<boolean> = new EventEmitter<boolean>();
  /** Evento para alternar el menú de información */
  @Output() toggleInformationMenu: EventEmitter<boolean> = new EventEmitter<boolean>();
  /** Evento para alternar el menú de notificaciones */
  @Output() toggleNotificationsMenu: EventEmitter<boolean> = new EventEmitter<boolean>();
  /** Estado de expansión de la barra de navegación */
  @Input() navBarExpanded: boolean = false;
  /** URL de la imagen del usuario */
  userImageUrl: string | null = null;
  /** Nombre de usuario */
  userName: string | null = null;
  /** Nombre para mostrar */
  displayName: string | null = null;
  /** Nombre del usuario */
  name: string | null = null;
  /** Apellido del usuario */
  surname: string | null = null;
  /** URL base de la API */
  apiUrl: string = apiUrl;
  /** Indica si está en vista móvil */
  isMobileView: boolean = false;
  /** Estado del menú de usuario */
  userMenuOpen: boolean = false;
  /** Número de notificaciones no leídas */
  notificationCount: number = 0;
  /** Array de suscripciones para cleanup */
  private subscriptions: Subscription[] = [];
  /** ID del usuario actual */
  private userId: string | null = null;

  constructor(private notificationService: NotificationService, public router: Router) { }

  /**
   * Inicialización del componente
   * Configura el usuario, notificaciones y responsive design
   */

  async ngOnInit() {
    // Primero verificamos el tamaño de la pantalla
    this.checkScreenSize();

    // Obtener el usuario de la sesión
    const user = sessionStorage.getItem('user');
    if (user) {
      const userData = JSON.parse(user);
      this.setUserData(userData);
    } else {
      const firebaseUser = await getCurrentUser();
      if (firebaseUser) {
        await setSessionStorage(firebaseUser.uid);
        const user = sessionStorage.getItem('user');
        if (user) {
          const userData = JSON.parse(user);
          this.setUserData(userData);
        }
      }
    }

    // Hilo de las notificaciones
    if (this.userId) {
      this.notificationService.connect(this.userId);

      // Suscribirse al contador de notificaciones (formato actualizado)
      this.subscriptions.push(
        this.notificationService.notificationCount$.subscribe(countData => {
          // Actualizamos el contador con el número de notificaciones no leídas
          this.notificationCount = countData.unreadCount;
        })
      );
    }
  }

  ngOnDestroy() {
    // Desuscribirse para evitar memory leaks
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.notificationService.disconnect();
  }

  private setUserData(userData: any) {
    this.userId = userData.uid;
    this.userName = userData.username;
    this.userImageUrl = userData.imageUrl;
    this.name = userData.name;
    this.surname = userData.surname;

    // Actualizar el displayName según el tamaño de la pantalla
    this.updateDisplayName();
  }

  toggleNavBar() {
    this.navBarExpanded = !this.navBarExpanded;
    this.toggleLateralMenu.emit(this.navBarExpanded);
  }

  toggleUserMenu(event: Event) {
    event.stopPropagation();
    this.userMenuOpen = !this.userMenuOpen;
  }

  openFriendsMenu(event: Event) {
    event.stopPropagation();
    this.toggleFriendsMenu.emit(true);
  }

  openInformationMenu(event: Event) {
    event.stopPropagation();
    this.toggleInformationMenu.emit(true);
  }

  openNotificationsMenu(event: Event) {
    event.stopPropagation();
    this.toggleNotificationsMenu.emit(true);
  }

  @HostListener('document:click')
  closeUserMenu() {
    if (this.userMenuOpen) {
      this.userMenuOpen = false;
    }
  }

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.checkScreenSize();
    this.updateDisplayName();
  }

  checkScreenSize() {
    this.isMobileView = window.innerWidth < 768;
  }

  updateDisplayName() {
    if (!this.name) return;

    if (this.isMobileView) {
      this.displayName = this.name;
    } else {
      this.displayName = this.name + ' ' + (this.surname || '');
    }
  }

  async logout(event: Event) {
    event.stopPropagation();
    await logOut();
    window.location.href = '/auth/login';
  }
}