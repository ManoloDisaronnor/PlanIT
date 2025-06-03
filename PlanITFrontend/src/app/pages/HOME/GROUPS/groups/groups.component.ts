import { Component, ElementRef, ViewChild, HostListener, Renderer2, AfterViewChecked } from '@angular/core';
import { InfodialogComponent } from '../../../../components/infodialog/infodialog.component';
import { CommonModule } from '@angular/common';
import { apiUrl } from '../../../../../../config/config';
import { GroupsCreateComponent } from "../groups-create/groups-create.component";
import { Router, RouterModule, RouterOutlet } from '@angular/router';
import { CamaraComponent } from '../../../../components/camara/camara.component';
import { DotLottie } from '@lottiefiles/dotlottie-web';
import { NotificationService } from '../../../../../../services/notification.service';
import { LoadinganimationComponent } from "../../../../components/loadinganimation/loadinganimation.component";
import { FormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, Subject, Subscription } from 'rxjs';
import { MessagesService } from '../../../../../../services/messages.service';
import { getCurrentUser, setSessionStorage } from '../../../../../../config/authUser';
import { GroupMessagesService } from '../../../../../../services/groups.service';

/**
 * Componente principal para la gestión de grupos
 * Permite visualizar, buscar, crear y administrar grupos del usuario
 * Incluye funcionalidades de chat en tiempo real y gestión de miembros
 * 
 * @class GroupsComponent
 * @implements {AfterViewChecked}
 * @since 1.0.0
 * @author Manuel Santos Márquez
 */
@Component({
  selector: 'app-groups',
  imports: [CommonModule, InfodialogComponent, GroupsCreateComponent, RouterOutlet, CamaraComponent, RouterModule, LoadinganimationComponent, FormsModule],
  templateUrl: './groups.component.html',
  styleUrl: './groups.component.css'
})
export class GroupsComponent implements AfterViewChecked {  /** Lista de grupos del usuario */
  groupList: any[] = [];
  /** Mensaje de error general */
  generalError: string | null = null;
  /** Tipo de error para el componente de diálogo */
  typeError: string = 'error';
  /** Controla la visibilidad del modal */
  showModal: boolean = false;
  /** Controla la visibilidad de la cámara */
  showCamera: boolean = false;
  /** Indica si el menú de grupo se está cerrando */
  groupMenuClosing: boolean = false;

  /** UID del usuario actual */
  userUid: string = '';
  /** Nombre del usuario actual */
  userName: string = '';
  /** URL de la imagen del usuario actual */
  userImageUrl: string = '';
  /** URL base de la API */
  apiUrl: string = apiUrl;

  /** Límite de grupos por carga */
  groupLimit: number = 10;
  /** Offset para paginación de grupos */
  groupOffset: number = 0;
  /** Término de búsqueda de grupos */
  searchGroup: string = '';
  /** Subject para debounce de búsqueda */
  private searchDebouncer = new Subject<string>();
  /** Suscripción al observable de búsqueda */
  private searchSubscription: Subscription;
  /** Indica si no hay más grupos para cargar */
  noMoreGroups: boolean = false;
  /** Estado de carga de grupos */
  loadingGroups: boolean = false;
  /** ID del grupo actualmente en carga */
  loadingGroup: string = '';
  /** ID del grupo sobre el que está el hover */
  groupHovered: string = '';
  /** ID del grupo con acción seleccionada */
  groupActionSelected: string = '';
  /** ID del grupo con acción táctil seleccionada */
  groupActionTouchSelected: string = '';

  /** Estilos para posicionamiento del menú contextual */
  menuStyles: { top?: string; left?: string } = {};
  /** Controla la visibilidad del diálogo de alerta */
  showAlertDialog: boolean = false;
  /** Grupo actualmente seleccionado */
  groupSelected: any | null = null;

  longPressTimeout: any = null;
  longPressDuration: number = 500;
  touchStartX: number = 0;
  touchStartY: number = 0;
  touchMoveThreshold: number = 10;
  isLongPressActive: boolean = false;

  private dotLottieInstance!: DotLottie;
  private lottieInitialized = false;

  private paramSub?: Subscription;
  private subscriptions: Subscription[] = [];
  private groupSubscriptions: { [groupId: string]: Subscription[] } = {};

  totalUnreadMessages: number = 0;

  @ViewChild('lottieCanvas', { static: false })
  lottieCanvas!: ElementRef<HTMLCanvasElement>;

  @ViewChild(GroupsCreateComponent) groupsCreateComponent!: GroupsCreateComponent;

  @HostListener('document:touchstart', ['$event'])
  onDocumentTouchStart(event: TouchEvent) {
    const menuElement = document.querySelector('.group-item-actions-menu-show');
    if (menuElement && !menuElement.contains(event.target as Node)) {
      this.closeGroupActionMenu();
    }
  }

  constructor(
    private renderer: Renderer2,
    private notificationService: NotificationService,
    public router: Router,
    private messagesService: MessagesService,
    private groupMessagesService: GroupMessagesService
  ) {
    this.searchSubscription = this.searchDebouncer.pipe(
      debounceTime(500),
      distinctUntilChanged()
    ).subscribe(searchTerm => {
      this.groupOffset = 0;
      this.groupList = [];
      this.noMoreGroups = false;
      this.getGroupList(true);
    });
  }

  onSearchGroupChange(): void {
    this.searchDebouncer.next(this.searchGroup);
  }

  async ngOnInit() {
    await this.getUserId().then(async () => {
      this.groupMessagesService.connect(this.userUid);

      await this.getGroupList();
    });
  }

  ngAfterViewChecked(): void {
    if (!this.lottieInitialized && this.lottieCanvas && this.lottieCanvas.nativeElement) {
      this.initializeLottie();
      this.lottieInitialized = true;
    }
  }

  ngOnDestroy(): void {
    if (this.dotLottieInstance) {
      this.dotLottieInstance.destroy();
    }

    document.removeEventListener('click', this.handleOutsideClick);
    document.removeEventListener('keydown', this.handleEscKey);

    this.cancelLongPress();
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.groupMessagesService.disconnect();
  }

  private initializeLottie(): void {
    this.dotLottieInstance = new DotLottie({
      canvas: this.lottieCanvas.nativeElement,
      autoplay: true,
      loop: true,
      speed: 0.7,
      src: 'https://lottie.host/aff17033-e69b-43b8-910f-ee48cbf3eac6/m6AMHlXJmR.lottie',
    });

    Object.values(this.groupSubscriptions).forEach(subscriptions => {
      subscriptions.forEach(sub => sub.unsubscribe());
    });
    this.groupSubscriptions = {};

    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.groupMessagesService.disconnect();
  }

  async getUserId(): Promise<void> {
    const user = sessionStorage.getItem('user');
    if (user) {
      const userData = JSON.parse(user);
      this.userUid = userData.uid;
      this.userName = userData.username;
      this.userImageUrl = userData.imageUrl;
    } else {
      const firebaseUser = await getCurrentUser();
      if (firebaseUser) {
        await setSessionStorage(firebaseUser.uid);
        const user = sessionStorage.getItem('user');
        if (user) {
          const userData = JSON.parse(user);
          this.userUid = userData.uid;
          this.userName = userData.username;
          this.userImageUrl = userData.imageUrl;
        }
      }
    }
  }

  onScroll(event: any): void {
    const element = event.target;
    const atBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 1;

    if (atBottom && !this.loadingGroups && !this.noMoreGroups) {
      this.getGroupList();
    }
  }

  async toggleFixGroup(groupId: string, event: any) {
    event.stopPropagation();
    this.closeGroupActionMenu();
    if (this.loadingGroup === groupId) return;
    this.loadingGroup = groupId;
    try {
      const response = await fetch(`${apiUrl}api/grupos/fix/${groupId}`, {
        method: 'PUT',
        credentials: 'include'
      });
      if (response.ok) {
        this.groupList = this.groupList.map(group => {
          if (group.groups_group.id === groupId) {
            group.fixed = group.fixed ? 0 : 1;
          }
          return group;
        });
        
        this.groupList.sort((a, b) => {
          if (a.fixed && !b.fixed) return -1;
          if (!a.fixed && b.fixed) return 1;
          const dateA = new Date(a.joined_at);
          const dateB = new Date(b.joined_at);
          return dateB.getTime() - dateA.getTime();
        });
      } else {
        const data = await response.json();
        this.showInformation(data.mensaje, "error");
      }
    } catch (error: any) {
      this.showInformation(error.message, "error");
    } finally {
      this.loadingGroup = '';
    }
  }

  async getGroupList(reset: boolean = false) {
    if (this.loadingGroups || this.noMoreGroups) return;

    this.loadingGroups = true;
    try {
      const response = await fetch(`${apiUrl}api/grupos/usergroups?limit=${this.groupLimit}&offset=${this.groupOffset}&search=${this.searchGroup}`, {
        method: 'GET',
        credentials: 'include',
      });
      const data = await response.json();
      if (response.ok) {
        const newGroups = data.datos;

        for (const group of newGroups) {
          if (group && group.groups_group && group.groups_group.id) {
            const groupId = group.groups_group.id;
            this.groupMessagesService.joinGroup(groupId);
            group.unreadCount = 0;
            if (!this.groupSubscriptions[groupId]) {
              this.groupSubscriptions[groupId] = [];
            }
            const messageSubscription = this.groupMessagesService
              .getLastMessage(groupId)
              .subscribe(lastMessage => {
                const groupInList = this.groupList.find(g =>
                  g.groups_group && g.groups_group.id === groupId
                );

                if (groupInList) {
                  groupInList.lastMessage = lastMessage;
                }
              });

            const unreadCountSubscription = this.groupMessagesService
              .getUnreadCountForGroup(groupId)
              .subscribe(count => {
                const groupInList = this.groupList.find(g =>
                  g.groups_group && g.groups_group.id === groupId
                );

                if (groupInList) {
                  groupInList.unreadCount = count;
                }
              });

            this.groupSubscriptions[groupId].push(messageSubscription, unreadCountSubscription);
            this.subscriptions.push(messageSubscription, unreadCountSubscription);
          }
        }

        if (reset) {
          if (this.groupList.length > 0) {
            this.groupList.forEach(group => {
              if (group.groups_group && group.groups_group.id) {
                const groupId = group.groups_group.id;
                if (this.groupSubscriptions[groupId]) {
                  this.groupSubscriptions[groupId].forEach(sub => {
                    sub.unsubscribe();
                  });
                  delete this.groupSubscriptions[groupId];
                }
              }
            });
          }
          this.groupList = newGroups;
          this.groupOffset = newGroups.length;
        } else {
          this.groupList = [...this.groupList, ...newGroups];
          this.groupOffset += newGroups.length;
        }

        if (newGroups.length < this.groupLimit) {
          this.noMoreGroups = true;
        }
      } else {
        if (data.codError === "NO_GROUPS_FOUND") {
          this.showInformation("No se encontraron grupos", "info");
          this.lottieInitialized = true;
        } else {
          this.showInformation(data.mensaje, "error");
        }
      }
    } catch (error: any) {
      this.showInformation(error.message, "error");
    } finally {
      this.loadingGroups = false;
    }
  }

  showInformation(error: string, type: string) {
    this.typeError = type;
    this.generalError = error;
    setTimeout(() => {
      this.generalError = null;
    }, 5000);
  }

  toggleModal() {
    this.showModal = !this.showModal;
  }

  startCamera() {
    this.showCamera = true;
  }

  handleImageCaptured(imageDataUrl: string) {
    this.groupsCreateComponent.handleWebcamImage(imageDataUrl);
  }

  groupHover(groupId: string, joined: boolean) {
    if ((this.groupHovered !== '' && groupId !== '') || !joined) return;
    this.groupHovered = groupId;
  }

  showGroupActionMenu(event: any, groupId: string) {
    event.stopPropagation();

    const btn = event.currentTarget as HTMLElement;
    const rect = btn.getBoundingClientRect();

    this.menuStyles = {
      top: `${rect.bottom + 5}px`,
      left: `${rect.right - 185}px`,
    };
    this.groupActionSelected = groupId;

    setTimeout(() => {
      document.addEventListener('click', this.handleOutsideClick);
      document.addEventListener('keydown', this.handleEscKey);
    }, 0);
  }

  onTouchActionStart(event: TouchEvent, group: any) {
    if (group.joined === 0) return;
    this.touchStartX = event.touches[0].clientX;
    this.touchStartY = event.touches[0].clientY;
    this.longPressTimeout = setTimeout(() => {
      this.isLongPressActive = true;
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
      const touch = event.touches[0];
      const rect = (event.target as HTMLElement).getBoundingClientRect();

      this.menuStyles = {
        top: `${touch.clientY}px`,
        left: `${Math.min(touch.clientX, window.innerWidth - 185)}px`,
      };
      setTimeout(() => {
        this.groupHovered = '';
        this.groupActionSelected = group.groups_group.id;
        this.groupActionTouchSelected = group.groups_group.id;
        setTimeout(() => {
          document.addEventListener('click', this.handleOutsideClick);
        }, 0);
      }
        , 200);
    }, this.longPressDuration);
  }

  onTouchActionMove(event: TouchEvent) {
    if (!this.longPressTimeout) return;
    const touchX = event.touches[0].clientX;
    const touchY = event.touches[0].clientY;
    const diffX = Math.abs(touchX - this.touchStartX);
    const diffY = Math.abs(touchY - this.touchStartY);
    if (diffX > this.touchMoveThreshold || diffY > this.touchMoveThreshold) {
      this.cancelLongPress();
    }
  }

  onTouchActionEnd() {
    this.cancelLongPress();
    if (this.isLongPressActive) {
      this.isLongPressActive = false;
    }
  }

  cancelLongPress() {
    if (this.longPressTimeout) {
      clearTimeout(this.longPressTimeout);
      this.longPressTimeout = null;
    }
  }

  onGroupItemClick(event: MouseEvent, group: any) {
    if (this.isLongPressActive) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
  }

  closeGroupActionMenu() {
    if (this.groupMenuClosing) return;

    this.groupMenuClosing = true;
    this.isLongPressActive = false;
    document.removeEventListener('click', this.handleOutsideClick);
    document.removeEventListener('keydown', this.handleEscKey);
    const menuElement = document.querySelector('.group-item-actions-menu-show');
    if (menuElement) {
      this.renderer.addClass(menuElement, 'group-item-actions-menu-close');
    }
    setTimeout(() => {
      this.groupActionSelected = '';
      this.groupActionTouchSelected = '';
      this.groupMenuClosing = false;
    }, 200);
  }

  handleOutsideClick = (event: MouseEvent) => {
    const menuElement = document.querySelector('.group-item-actions-menu');
    if (menuElement && !menuElement.contains(event.target as Node)) {
      this.closeGroupActionMenu();
    }
  }

  handleEscKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      this.closeGroupActionMenu();
    }
  }

  async acceptGroupRequest(groupId: string, event: any) {
    event.stopPropagation();
    this.loadingGroup = groupId;
    try {
      const response = await fetch(`${apiUrl}api/grupos/accept/${groupId}`, {
        method: 'PUT',
        credentials: 'include'
      });
      const data = await response.json();
      if (response.ok) {
        this.notificationService.hideNotificationFromEntityGroup(data.datos.id);
        this.getGroupList(true);
      } else {
        this.showInformation(data.mensaje, "error");
      }
    } catch (error: any) {
      this.showInformation(error.message, "error");
    } finally {
      this.loadingGroup = '';
    }
  }

  async rejectGroupRequest(groupId: string, event: any) {
    event.stopPropagation();
    this.loadingGroup = groupId;
    try {
      const response = await fetch(`${apiUrl}api/grupos/reject/${groupId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const data = await response.json();
      if (response.ok) {
        this.notificationService.hideNotificationFromEntityGroup(data.datos);
        this.getGroupList(true);
      } else {
        this.showInformation(data.mensaje, "error");
      }
    } catch (error: any) {
      this.showInformation(error.message, "error");
    } finally {
      this.loadingGroup = '';
    }
  }

  showAlertDialogFunction(event: any, group: any | null) {
    event.stopPropagation();
    this.showAlertDialog = !this.showAlertDialog;
    this.groupSelected = group;
  }

  async leaveGroup(event: any): Promise<void> {
    event.preventDefault();
    try {
      const response = await fetch(`${apiUrl}api/grupos/leave/${this.groupSelected.groups_group.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: this.userUid,
        })
      });

      if (response.ok) {
        window.location.href = '/home/groups';
      } else {
        const data = await response.json();
        console.error(data.mensaje);
      }

    } catch (error: any) {
      console.error(error.message);
    }
  }

  navigateToGroupChat(group: any) {
    if (group.joined === 0) return;
    if (group.joined === 1) {
      this.groupMessagesService.markGroupAsRead(group.groups_group.id);
    }
    this.router.navigate([`/home/groups/chat/${group.groups_group.id}`]);
  }
}