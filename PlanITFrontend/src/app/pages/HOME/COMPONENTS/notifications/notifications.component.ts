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

  loadingNotificationRead: number | null = null;

  // Propiedades para el deslizamiento
  private activeSwipeItem: HTMLElement | null = null;
  private startX: number = 0;
  private startY: number = 0;
  private currentX: number = 0;
  private currentY: number = 0;
  private swipeThreshold: number = 100;
  private swipeStartThreshold: number = 10;
  private animating: boolean = false;
  private swipeDirection: 'left' | 'right' | null = null;
  private isScrolling: boolean = false;

  private subscriptions: Subscription[] = [];
  private scrollSubscription?: Subscription;

  constructor(
    private notificationService: NotificationService,
    private renderer: Renderer2
  ) { }

  async ngOnInit(): Promise<void> {
    await this.getUserId();

    if (this.userUid) {
      this.notificationService.connect(this.userUid, 5);
    }

    this.subscriptions.push(
      this.notificationService.notifications$.subscribe(notifications => {
        this.notifications = notifications;
        this.isLoading = false;
      })
    );

    this.subscriptions.push(
      this.notificationService.loading$.subscribe(loading => {
        this.isLoadingMore = loading;
      })
    );

    this.subscriptions.push(
      this.notificationService.hasMoreNotifications$.subscribe(hasMore => {
        this.hasMoreNotifications = hasMore;
      })
    );

    this.subscriptions.push(
      this.notificationService.notificationCount$.subscribe(countData => {
        this.unreadNotificationsCount = countData.unreadCount;
      })
    );

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
    setTimeout(() => {
      if (this.notificationContainer) {

        this.scrollSubscription = fromEvent(this.notificationContainer.nativeElement, 'scroll')
          .pipe(debounceTime(150))
          .subscribe(() => {
            this.checkScrollPosition();
          });
        this.notificationContainer.nativeElement.addEventListener('scroll', (event: Event) => {
        });
      } else {
        console.error('No se encontró el contenedor de notificaciones');
      }
    }, 500);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    if (this.scrollSubscription) {
      this.scrollSubscription.unsubscribe();
    }

    if (this.notificationContainer) {
      this.notificationContainer.nativeElement.removeEventListener('scroll', this.onScroll);
    }
  }

  private shouldAllowSwipe(notificationItem: HTMLElement): boolean {
    if (!notificationItem) return false;

    const notificationId = Number(notificationItem.getAttribute('data-notification-id'));
    const notification = this.notifications.find(n => n.id === notificationId);

    if (notification &&
      notification.type === 'friendRequest' &&
      notification.content.user_send !== this.userUid &&
      notification.content.accepted === 0) {
      return false;
    }

    return true;
  }

  onTouchStart(event: TouchEvent): void {
    if (this.animating) return;

    const item = event.currentTarget as HTMLElement;
    if (!item) return;

    if (!this.shouldAllowSwipe(item)) return;

    this.activeSwipeItem = item;
    this.startX = event.touches[0].clientX;
    this.startY = event.touches[0].clientY;
    this.currentX = this.startX;
    this.currentY = this.startY;
    this.swipeDirection = null;
    this.isScrolling = false;
  }

  onTouchMove(event: TouchEvent): void {
    if (!this.activeSwipeItem || this.animating) return;

    this.currentX = event.touches[0].clientX;
    this.currentY = event.touches[0].clientY;

    const deltaX = this.currentX - this.startX;
    const deltaY = this.currentY - this.startY;

    if (!this.isScrolling && this.swipeDirection === null) {
      if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > this.swipeStartThreshold) {
        this.isScrolling = true;
        this.activeSwipeItem = null;
        return;
      } else if (Math.abs(deltaX) > this.swipeStartThreshold) {
        this.swipeDirection = deltaX < 0 ? 'left' : 'right';
        this.renderer.setStyle(this.activeSwipeItem, 'transition', 'none');
        event.preventDefault();
      } else {
        return;
      }
    }

    if (this.isScrolling) return;
    const moveX = deltaX * 0.8;
    this.renderer.setStyle(this.activeSwipeItem, 'transform', `translateX(${moveX}px)`);
    const opacity = Math.max(0.5, 1 - Math.abs(deltaX) / 300);
    this.renderer.setStyle(this.activeSwipeItem, 'opacity', opacity.toString());
    this.updateDeleteIndicator(deltaX);
  }

  onTouchEnd(): void {
    if (!this.activeSwipeItem || this.animating || this.isScrolling) return;

    const deltaX = this.currentX - this.startX;

    if (Math.abs(deltaX) >= this.swipeThreshold) {
      this.animateAndDelete();
    } else {
      this.resetSwipeItem();
    }

    this.isScrolling = false;
  }

  onMouseDown(event: MouseEvent): void {
    if (this.animating) return;

    const item = event.currentTarget as HTMLElement;
    if (!item) return;

    if (!this.shouldAllowSwipe(item)) return;

    this.activeSwipeItem = item;
    this.startX = event.clientX;
    this.startY = event.clientY;
    this.currentX = this.startX;
    this.currentY = this.startY;
    this.swipeDirection = null;
    this.isScrolling = false;

    // Agregar manejadores de eventos globales
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('mouseup', this.handleMouseUp);

    event.preventDefault();
  }

  private handleMouseMove = (event: MouseEvent) => {
    if (!this.activeSwipeItem || this.animating) return;

    this.currentX = event.clientX;
    this.currentY = event.clientY;

    const deltaX = this.currentX - this.startX;
    const deltaY = this.currentY - this.startY;

    if (!this.isScrolling && this.swipeDirection === null) {
      if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > this.swipeStartThreshold) {
        this.isScrolling = true;
        this.activeSwipeItem = null;

        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('mouseup', this.handleMouseUp);
        return;
      } else if (Math.abs(deltaX) > this.swipeStartThreshold) {
        this.swipeDirection = deltaX < 0 ? 'left' : 'right';
        this.renderer.setStyle(this.activeSwipeItem, 'transition', 'none');
      } else {
        return;
      }
    }
    if (this.isScrolling) return;

    const moveX = deltaX * 0.8;
    this.renderer.setStyle(this.activeSwipeItem, 'transform', `translateX(${moveX}px)`);

    const opacity = Math.max(0.5, 1 - Math.abs(deltaX) / 300);
    this.renderer.setStyle(this.activeSwipeItem, 'opacity', opacity.toString());
    this.updateDeleteIndicator(deltaX);
    event.preventDefault();
  };

  private handleMouseUp = () => {
    if (!this.activeSwipeItem || this.animating || this.isScrolling) return;

    const deltaX = this.currentX - this.startX;

    if (Math.abs(deltaX) >= this.swipeThreshold) {
      this.animateAndDelete();
    } else {
      this.resetSwipeItem();
    }

    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);

    this.isScrolling = false;
  };

  private updateDeleteIndicator(deltaX: number): void {
    if (!this.activeSwipeItem) return;
    if (Math.abs(deltaX) > this.swipeThreshold * 0.5) {
      if (deltaX < 0) {
        this.renderer.setStyle(this.activeSwipeItem, 'background-color', 'rgba(244, 67, 54, 0.3)');
      } else {
        this.renderer.setStyle(this.activeSwipeItem, 'background-color', 'rgba(244, 67, 54, 0.3)');
      }
    } else {
      this.renderer.removeStyle(this.activeSwipeItem, 'background-color');
    }
  }

  private animateAndDelete(): void {
    if (!this.activeSwipeItem || this.animating) return;

    const notificationItem = this.activeSwipeItem;
    const notificationId = Number(notificationItem.getAttribute('data-notification-id'));
    this.animating = true;

    const notification = this.notifications.find(n => n.id === notificationId);
    const isFriendRequest = notification &&
      notification.type === 'friendRequest' &&
      notification.content.accepted === 0;

    const finalX = this.swipeDirection === 'left' ? -window.innerWidth : window.innerWidth;

    this.renderer.setStyle(notificationItem, 'transition', 'all 0.3s ease-out');
    this.renderer.setStyle(notificationItem, 'transform', `translateX(${finalX}px)`);
    this.renderer.setStyle(notificationItem, 'opacity', '0');

    setTimeout(async () => {
      if (isFriendRequest && notification) {
        if (notification.content.user_send !== this.userUid) {
          await this.rejectFriendRequest(notification.content.id, notificationId, new Event('swipe'));
        }
      }

      this.deleteNotification(notificationId);

      this.activeSwipeItem = null;
      this.animating = false;
    }, 300);
  }

  private resetSwipeItem(): void {
    if (!this.activeSwipeItem) return;

    this.renderer.setStyle(this.activeSwipeItem, 'transition', 'all 0.2s ease-out');
    this.renderer.setStyle(this.activeSwipeItem, 'transform', 'translateX(0)');
    this.renderer.setStyle(this.activeSwipeItem, 'opacity', '1');
    this.renderer.removeStyle(this.activeSwipeItem, 'background-color');

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

  @HostListener('window:scroll', ['$event'])
  windowScrollEvent() {
  }

  checkScrollPosition(): void {
    if (!this.notificationContainer || this.isLoadingMore || !this.hasMoreNotifications) {
      return;
    }

    const element = this.notificationContainer.nativeElement;

    const scrollPosition = element.scrollTop + element.clientHeight;
    const scrollHeight = element.scrollHeight;
    const scrollPercentage = scrollPosition / scrollHeight;

    if (scrollPercentage > this.scrollThreshold) {
      this.loadMoreNotifications();
    }
  }

  onScroll(): void {
    this.checkScrollPosition();
  }

  loadMoreNotifications(): void {
    if (!this.isLoadingMore && this.hasMoreNotifications) {
      this.notificationService.loadMoreNotifications();
    }
  }

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

  async acceptFriendRequest(notificationId: number, event: Event): Promise<void> {
    event.stopPropagation();
    this.loadingRequest = notificationId;
    const success = await this.notificationService.acceptFriendRequest(notificationId);
    if (!success) {
      this.showInformation('Error al aceptar la solicitud de amistad');
    }
    this.loadingRequest = 0;
  }

  async acceptGroupRequest(notificationId: number, event: Event): Promise<void> {
    event.stopPropagation();
    this.loadingRequest = notificationId;
    const success = await this.notificationService.acceptGroupRequest(notificationId);
    if (!success) {
      this.showInformation('Error al aceptar la solicitud de grupo');
    }
    this.loadingRequest = 0;
  }

  async rejectFriendRequest(friendRequestId: number, notificationId: number, event: Event): Promise<void> {
    event.stopPropagation();
    this.loadingRequest = friendRequestId;
    const success = await this.notificationService.rejectGroupRequest(notificationId);
    this.loadingRequest = 0;
    if (!success) {
      this.showInformation('Error al rechazar solicitud de amistad');
    }
  }

  async markNotificationAsRead(notificationId: number, alreadyRead: boolean, event: Event): Promise<void> {
    event.stopPropagation();
    if (this.loadingNotificationRead === notificationId) return;
    if (!alreadyRead) {
      this.loadingNotificationRead = notificationId;
      await this.notificationService.markAsRead(notificationId);
      this.loadingNotificationRead = null;
    }
  }

  async markAllNotificationsAsRead(event: Event): Promise<void> {
    event.stopPropagation();
    const success = await this.notificationService.markAllAsRead();
    if (!success) {
      this.showInformation('Error al marcar todas las notificaciones como leídas');
    }
  }

  async refreshNotifications(): Promise<void> {
    this.isRefreshing = true;
    this.notificationService.resetPagination();
    await this.notificationService.loadNotifications(false);
    this.isRefreshing = false;
  }
}