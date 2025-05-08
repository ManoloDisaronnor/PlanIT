import { Component, ElementRef, ViewChild, HostListener, Renderer2, AfterViewChecked } from '@angular/core';
import { getCurrentUser, setSessionStorage } from '../../../../../../config/authUser';
import { InfodialogComponent } from '../../../../components/infodialog/infodialog.component';
import { CommonModule } from '@angular/common';
import { apiUrl } from '../../../../../../config/config';
import { GroupsCreateComponent } from "../groups-create/groups-create.component";
import { RouterModule, RouterOutlet } from '@angular/router';
import { CamaraComponent } from '../../../../components/camara/camara.component';
import { DotLottie } from '@lottiefiles/dotlottie-web';
import { NotificationService } from '../../../../../../services/notification.service';
import { LoadinganimationComponent } from "../../../../components/loadinganimation/loadinganimation.component";
import { FormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, Subject, Subscription } from 'rxjs';

@Component({
  selector: 'app-groups',
  imports: [CommonModule, InfodialogComponent, GroupsCreateComponent, RouterOutlet, CamaraComponent, RouterModule, LoadinganimationComponent, FormsModule],
  templateUrl: './groups.component.html',
  styleUrl: './groups.component.css'
})
export class GroupsComponent implements AfterViewChecked {
  groupList: any[] = [];
  generalError: string | null = null;
  typeError: string = 'error';
  showModal: boolean = false;
  showCamera: boolean = false;
  groupMenuClosing: boolean = false;

  apiUrl: string = apiUrl;

  groupLimit: number = 10;
  groupOffset: number = 0;
  searchGroup: string = '';
  private searchDebouncer = new Subject<string>();
  private searchSubscription: Subscription;
  noMoreGroups: boolean = false;
  loadingGroups: boolean = false;
  loadingGroup: string = '';
  groupHovered: string = '';
  groupActionSelected: string = '';
  menuStyles: { top?: string; left?: string } = {};

  // Variables para manejar el long press
  longPressTimeout: any = null;
  longPressDuration: number = 500; // Tiempo en ms para considerar un long press
  touchStartX: number = 0;
  touchStartY: number = 0;
  touchMoveThreshold: number = 10; // Umbral de movimiento para cancelar el long press
  isLongPressActive: boolean = false;

  private dotLottieInstance!: DotLottie;
  private lottieInitialized = false;

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

  constructor(private renderer: Renderer2, private notificationService: NotificationService) {
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
    await this.getGroupList();
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
  }

  private initializeLottie(): void {
    this.dotLottieInstance = new DotLottie({
      canvas: this.lottieCanvas.nativeElement,
      autoplay: true,
      loop: true,
      speed: 0.7,
      src: 'https://lottie.host/aff17033-e69b-43b8-910f-ee48cbf3eac6/m6AMHlXJmR.lottie',
    });
  }

  onScroll(event: any): void {
    const element = event.target;
    const atBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 1;

    if (atBottom && !this.loadingGroups && !this.noMoreGroups) {
      this.getGroupList();
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

        if (reset) {
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
          this.showInformation("No tienes grupos creados", "info");
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

  groupHover(groupId: string) {
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
}