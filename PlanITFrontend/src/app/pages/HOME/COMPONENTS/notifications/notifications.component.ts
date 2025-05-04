import { Component, EventEmitter, OnDestroy, OnInit, Output, ViewChild, ElementRef, AfterViewInit, HostListener, Renderer2 } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { NotificationService, Notification } from '../../../../../../services/notification.service';
import { Subscription, debounceTime, fromEvent } from 'rxjs';
import { apiUrl } from '../../../../../../config/config';
import { LoadinganimationComponent } from "../../../../components/loadinganimation/loadinganimation.component";
import { getCurrentUser, setSessionStorage } from '../../../../../../config/authUser';
import { InfodialogComponent } from "../../../../components/infodialog/infodialog.component";

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, MatIconModule, LoadinganimationComponent, InfodialogComponent],
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.css'
})
export class NotificationsComponent implements OnInit, OnDestroy, AfterViewInit {
  @Output() close: EventEmitter<void> = new EventEmitter<void>();
  @ViewChild('notificationsContent') notificationContainer!: ElementRef;

  notifications: Notification[] = [];
  isLoading: boolean = true;
  isLoadingMore: boolean = false;
  isRefreshing: boolean = false;
  loadingRequest: number = 0;
  apiUrl: string = apiUrl;
  userUid: string | null = null;
  generalError: string | null = null;
  hasMoreNotifications: boolean = true;
  unreadNotificationsCount: number = 0;
  scrollThreshold: number = 0.6;

  // Propiedades para el deslizamiento
  private activeSwipeItem: HTMLElement | null = null;
  private startX: number = 0;
  private startY: number = 0; // Añadido para detectar dirección vertical
  private currentX: number = 0;
  private currentY: number = 0; // Añadido para detectar dirección vertical
  private swipeThreshold: number = 100;
  private swipeStartThreshold: number = 10; // Umbral mínimo para determinar dirección del gesto
  private animating: boolean = false;
  private swipeDirection: 'left' | 'right' | null = null;
  private isScrolling: boolean = false; // Bandera para determinar si estamos en modo scroll

  private subscriptions: Subscription[] = [];
  private scrollSubscription?: Subscription;

  constructor(
    private notificationService: NotificationService,
    private renderer: Renderer2
  ) { }

  async ngOnInit(): Promise<void> {
    // Obtener userId del sessionStorage o de Firebase
    await this.getUserId();

    // Conectar el socket con el userId (configurando un límite inicial de 5)
    if (this.userUid) {
      this.notificationService.connect(this.userUid, 5);
    }

    // Suscribirse a las notificaciones
    this.subscriptions.push(
      this.notificationService.notifications$.subscribe(notifications => {
        this.notifications = notifications;
        this.isLoading = false;
        console.log('Notificaciones recibidas:', notifications.length);
      })
    );

    // Suscribirse al estado de carga
    this.subscriptions.push(
      this.notificationService.loading$.subscribe(loading => {
        this.isLoadingMore = loading;
      })
    );

    // Suscribirse al estado de "hay más notificaciones"
    this.subscriptions.push(
      this.notificationService.hasMoreNotifications$.subscribe(hasMore => {
        this.hasMoreNotifications = hasMore;
      })
    );

    this.subscriptions.push(
      this.notificationService.notificationCount$.subscribe(countData => {
        // Actualizamos el contador con el número de notificaciones no leídas
        this.unreadNotificationsCount = countData.unreadCount;
      })
    );

    // Forzar un refresco del layout después de la inicialización
    setTimeout(() => {
      if (this.notificationContainer) {
        this.notificationContainer.nativeElement.style.display = 'none';
        setTimeout(() => {
          this.notificationContainer.nativeElement.style.display = 'flex';
        }, 0);
      }
    }, 100);
  }

  ngAfterViewInit(): void {
    // Importante: Esperamos un momento para asegurarnos de que el DOM está completamente renderizado
    setTimeout(() => {
      if (this.notificationContainer) {

        // Usamos fromEvent y debounceTime para mejorar el rendimiento
        this.scrollSubscription = fromEvent(this.notificationContainer.nativeElement, 'scroll')
          .pipe(debounceTime(150)) // Evita múltiples llamadas en rápida sucesión
          .subscribe(() => {
            this.checkScrollPosition();
          });

        // También añadimos el listener directo para depuración
        this.notificationContainer.nativeElement.addEventListener('scroll', (event: Event) => {
        });
      } else {
        console.error('No se encontró el contenedor de notificaciones');
      }
    }, 500);
  }

  ngOnDestroy(): void {
    // Limpieza de suscripciones
    this.subscriptions.forEach(sub => sub.unsubscribe());
    if (this.scrollSubscription) {
      this.scrollSubscription.unsubscribe();
    }

    // Eliminar el listener de scroll
    if (this.notificationContainer) {
      this.notificationContainer.nativeElement.removeEventListener('scroll', this.onScroll);
    }
  }

  // Método para verificar si se debe permitir el swipe en una notificación
  private shouldAllowSwipe(notificationItem: HTMLElement): boolean {
    if (!notificationItem) return false;

    // Obtener el ID de la notificación
    const notificationId = Number(notificationItem.getAttribute('data-notification-id'));
    const notification = this.notifications.find(n => n.id === notificationId);

    // No permitir swipe para solicitudes de amistad pendientes que requieren acción del usuario
    if (notification &&
      notification.type === 'friendRequest' &&
      notification.content.user_send !== this.userUid &&
      notification.content.accepted === 0) {
      return false;
    }

    return true;
  }

  // Eventos para el deslizamiento
  onTouchStart(event: TouchEvent): void {
    if (this.animating) return;

    const item = event.currentTarget as HTMLElement;
    if (!item) return;

    // Verificar si debemos permitir el swipe
    if (!this.shouldAllowSwipe(item)) return;

    this.activeSwipeItem = item;
    this.startX = event.touches[0].clientX;
    this.startY = event.touches[0].clientY; // Capturamos la posición Y inicial
    this.currentX = this.startX;
    this.currentY = this.startY; // Capturamos la posición Y actual
    this.swipeDirection = null;
    this.isScrolling = false; // Reseteamos el estado de scroll
  }

  onTouchMove(event: TouchEvent): void {
    if (!this.activeSwipeItem || this.animating) return;

    this.currentX = event.touches[0].clientX;
    this.currentY = event.touches[0].clientY;

    const deltaX = this.currentX - this.startX;
    const deltaY = this.currentY - this.startY;

    // Si aún no hemos determinado si es un scroll o un swipe
    if (!this.isScrolling && this.swipeDirection === null) {
      // Determinamos la dirección predominante
      if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > this.swipeStartThreshold) {
        // Es un gesto vertical (scroll)
        this.isScrolling = true;
        this.activeSwipeItem = null; // Liberamos el elemento para permitir scroll normal
        return;
      } else if (Math.abs(deltaX) > this.swipeStartThreshold) {
        // Es un gesto horizontal (swipe)
        this.swipeDirection = deltaX < 0 ? 'left' : 'right';
        this.renderer.setStyle(this.activeSwipeItem, 'transition', 'none');
        // Prevenir scroll durante el deslizamiento horizontal
        event.preventDefault();
      } else {
        // Aún no hay suficiente movimiento para determinar la dirección
        return;
      }
    }

    // Si ya determinamos que es un scroll, no hacemos nada más
    if (this.isScrolling) return;

    // Aplicar transformación con resistencia (el movimiento es más lento que el dedo)
    const moveX = deltaX * 0.8;
    this.renderer.setStyle(this.activeSwipeItem, 'transform', `translateX(${moveX}px)`);

    // Cambiar opacidad para dar feedback visual
    const opacity = Math.max(0.5, 1 - Math.abs(deltaX) / 300);
    this.renderer.setStyle(this.activeSwipeItem, 'opacity', opacity.toString());

    // Mostrar indicador de eliminación
    this.updateDeleteIndicator(deltaX);
  }

  onTouchEnd(): void {
    if (!this.activeSwipeItem || this.animating || this.isScrolling) return;

    const deltaX = this.currentX - this.startX;

    if (Math.abs(deltaX) >= this.swipeThreshold) {
      // El usuario ha deslizado lo suficiente para eliminar
      this.animateAndDelete();
    } else {
      // No suficiente deslizamiento, volver a la posición original
      this.resetSwipeItem();
    }

    // Resetear estado de scroll
    this.isScrolling = false;
  }

  // Para soporte de mouse/escritorio
  onMouseDown(event: MouseEvent): void {
    if (this.animating) return;

    const item = event.currentTarget as HTMLElement;
    if (!item) return;

    // Verificar si debemos permitir el swipe
    if (!this.shouldAllowSwipe(item)) return;

    this.activeSwipeItem = item;
    this.startX = event.clientX;
    this.startY = event.clientY; // Capturamos la posición Y inicial
    this.currentX = this.startX;
    this.currentY = this.startY; // Capturamos la posición Y actual
    this.swipeDirection = null;
    this.isScrolling = false; // Reseteamos el estado de scroll

    // Agregar manejadores de eventos globales
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('mouseup', this.handleMouseUp);

    // Prevenir selección de texto durante el deslizamiento
    event.preventDefault();
  }

  // Definir como propiedades de clase para mantener el contexto 'this'
  private handleMouseMove = (event: MouseEvent) => {
    if (!this.activeSwipeItem || this.animating) return;

    this.currentX = event.clientX;
    this.currentY = event.clientY;

    const deltaX = this.currentX - this.startX;
    const deltaY = this.currentY - this.startY;

    // Si aún no hemos determinado si es un scroll o un swipe
    if (!this.isScrolling && this.swipeDirection === null) {
      // Determinamos la dirección predominante
      if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > this.swipeStartThreshold) {
        // Es un gesto vertical (scroll)
        this.isScrolling = true;
        this.activeSwipeItem = null; // Liberamos el elemento para permitir scroll normal

        // Limpiar manejadores de eventos
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('mouseup', this.handleMouseUp);
        return;
      } else if (Math.abs(deltaX) > this.swipeStartThreshold) {
        // Es un gesto horizontal (swipe)
        this.swipeDirection = deltaX < 0 ? 'left' : 'right';
        this.renderer.setStyle(this.activeSwipeItem, 'transition', 'none');
      } else {
        // Aún no hay suficiente movimiento para determinar la dirección
        return;
      }
    }

    // Si ya determinamos que es un scroll, no hacemos nada más
    if (this.isScrolling) return;

    // Aplicar transformación con resistencia
    const moveX = deltaX * 0.8;
    this.renderer.setStyle(this.activeSwipeItem, 'transform', `translateX(${moveX}px)`);

    // Cambiar opacidad
    const opacity = Math.max(0.5, 1 - Math.abs(deltaX) / 300);
    this.renderer.setStyle(this.activeSwipeItem, 'opacity', opacity.toString());

    // Mostrar indicador de eliminación
    this.updateDeleteIndicator(deltaX);

    // Prevenir selección de texto
    event.preventDefault();
  };

  private handleMouseUp = () => {
    if (!this.activeSwipeItem || this.animating || this.isScrolling) return;

    const deltaX = this.currentX - this.startX;

    if (Math.abs(deltaX) >= this.swipeThreshold) {
      // Eliminar
      this.animateAndDelete();
    } else {
      // Restaurar
      this.resetSwipeItem();
    }

    // Limpiar manejadores de eventos
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);

    // Resetear estado de scroll
    this.isScrolling = false;
  };

  private updateDeleteIndicator(deltaX: number): void {
    if (!this.activeSwipeItem) return;

    // Implementar indicadores visuales adicionales si se desea
    // Por ejemplo, cambiar color de fondo según la dirección
    if (Math.abs(deltaX) > this.swipeThreshold * 0.5) {
      if (deltaX < 0) {
        // Deslizamiento a la izquierda - color rojo
        this.renderer.setStyle(this.activeSwipeItem, 'background-color', 'rgba(244, 67, 54, 0.3)');
      } else {
        // Deslizamiento a la derecha - también color rojo
        this.renderer.setStyle(this.activeSwipeItem, 'background-color', 'rgba(244, 67, 54, 0.3)');
      }
    } else {
      // Restaurar color original
      this.renderer.removeStyle(this.activeSwipeItem, 'background-color');
    }
  }

  private animateAndDelete(): void {
    if (!this.activeSwipeItem || this.animating) return;

    const notificationItem = this.activeSwipeItem;
    const notificationId = Number(notificationItem.getAttribute('data-notification-id'));
    this.animating = true;

    // Comprobar si es una solicitud de amistad pendiente y rechazarla automáticamente
    const notification = this.notifications.find(n => n.id === notificationId);
    const isFriendRequest = notification &&
      notification.type === 'friendRequest' &&
      notification.content.accepted === 0;

    // Animación de deslizamiento fuera de la pantalla
    const finalX = this.swipeDirection === 'left' ? -window.innerWidth : window.innerWidth;

    this.renderer.setStyle(notificationItem, 'transition', 'all 0.3s ease-out');
    this.renderer.setStyle(notificationItem, 'transform', `translateX(${finalX}px)`);
    this.renderer.setStyle(notificationItem, 'opacity', '0');

    // Esperar a que termine la animación y luego eliminar
    setTimeout(async () => {
      if (isFriendRequest && notification) {
        // Si es una solicitud de amistad pendiente, rechazarla automáticamente antes de ocultarla
        if (notification.content.user_send !== this.userUid) {
          await this.rejectFriendRequest(notification.content.id, notificationId, new Event('swipe'));
        }
      }

      // Llamar al servicio para ocultar la notificación
      this.deleteNotification(notificationId);

      // Resetear estado
      this.activeSwipeItem = null;
      this.animating = false;
    }, 300);
  }

  private resetSwipeItem(): void {
    if (!this.activeSwipeItem) return;

    // Animación de vuelta a la posición original
    this.renderer.setStyle(this.activeSwipeItem, 'transition', 'all 0.2s ease-out');
    this.renderer.setStyle(this.activeSwipeItem, 'transform', 'translateX(0)');
    this.renderer.setStyle(this.activeSwipeItem, 'opacity', '1');
    this.renderer.removeStyle(this.activeSwipeItem, 'background-color');

    // Limpiar después de la animación
    setTimeout(() => {
      if (this.activeSwipeItem) {
        this.renderer.removeStyle(this.activeSwipeItem, 'transition');
      }
      this.activeSwipeItem = null;
    }, 200);
  }

  async deleteNotification(notificationId: number): Promise<void> {
    try {
      const success = await this.notificationService.hideNotification(notificationId);
      if (!success) {
        this.showInformation('Error al eliminar la notificación');
      }
    } catch (error) {
      console.error('Error al eliminar notificación:', error);
      this.showInformation('Error al eliminar la notificación');
    }
  }

  // Nuevo método que usa HostListener para capturar el scroll en cualquier lugar
  @HostListener('window:scroll', ['$event'])
  windowScrollEvent() {
  }

  // Método separado para verificar la posición del scroll
  checkScrollPosition(): void {
    if (!this.notificationContainer || this.isLoadingMore || !this.hasMoreNotifications) {
      return;
    }

    const element = this.notificationContainer.nativeElement;

    // Calcular la posición del scroll
    const scrollPosition = element.scrollTop + element.clientHeight;
    const scrollHeight = element.scrollHeight;
    const scrollPercentage = scrollPosition / scrollHeight;

    // Si hemos llegado cerca del final, cargar más notificaciones
    if (scrollPercentage > this.scrollThreshold) {
      this.loadMoreNotifications();
    }
  }

  // Método antiguo para mantener compatibilidad
  onScroll(): void {
    this.checkScrollPosition();
  }

  // Método para cargar más notificaciones
  loadMoreNotifications(): void {
    if (!this.isLoadingMore && this.hasMoreNotifications) {
      this.notificationService.loadMoreNotifications();
    }
  }

  // Método manual para probar la carga
  manualLoadMore(): void {
    this.loadMoreNotifications();
  }

  async getUserId(): Promise<void> {
    const user = sessionStorage.getItem('user');
    if (user) {
      const userData = JSON.parse(user);
      this.userUid = userData.uid;
    } else {
      const firebaseUser = await getCurrentUser();
      if (firebaseUser) {
        await setSessionStorage(firebaseUser.uid);
        const user = sessionStorage.getItem('user');
        if (user) {
          const userData = JSON.parse(user);
          this.userUid = userData.uid;
        }
      }
    }
  }

  showInformation(error: string) {
    this.generalError = error;
    setTimeout(() => {
      this.generalError = null;
    }, 5000);
  }

  closeNotifications(): void {
    this.close.emit();
  }

  // Calcular tiempo transcurrido para mostrar en la UI
  getTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();

    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `hace ${days} ${days === 1 ? 'día' : 'días'}`;
    } else if (hours > 0) {
      return `hace ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
    } else if (minutes > 0) {
      return `hace ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
    } else {
      return 'hace un momento';
    }
  }

  // Aceptar solicitud de amistad
  async acceptFriendRequest(notificationId: number, event: Event): Promise<void> {
    event.stopPropagation();
    this.loadingRequest = notificationId;
    const success = await this.notificationService.acceptFriendRequest(notificationId);
    if (!success) {
      this.showInformation('Error al aceptar la solicitud de amistad');
    }
    this.loadingRequest = 0;
  }

  // Rechazar solicitud de amistad
  async rejectFriendRequest(friendRequestId: number, notificationId: number, event: Event): Promise<void> {
    event.stopPropagation();
    this.loadingRequest = friendRequestId;
    console.log('Rechazando solicitud de amistad con ID:', friendRequestId, 'y notificación ID:', notificationId);
    const success = await this.notificationService.rejectFriendRequest(friendRequestId, notificationId);
    this.loadingRequest = 0;
    if (!success) {
      this.showInformation('Error al rechazar solicitud de amistad');
    }
  }

  async markNotificationAsRead(notificationId: number, alreadyRead: boolean, event: Event): Promise<void> {
    event.stopPropagation();
    if (!alreadyRead) {
      await this.notificationService.markAsRead(notificationId);
    }
  }

  async markAllNotificationsAsRead(event: Event): Promise<void> {
    event.stopPropagation();
    const success = await this.notificationService.markAllAsRead();
    if (!success) {
      this.showInformation('Error al marcar todas las notificaciones como leídas');
    }
  }

  // Función para actualizar la vista si se muestra o cambia
  async refreshNotifications(): Promise<void> {
    // Reiniciar la paginación y cargar nuevamente las notificaciones
    this.isRefreshing = true;
    this.notificationService.resetPagination();
    await this.notificationService.loadNotifications(false);
    this.isRefreshing = false;
  }
}