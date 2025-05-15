import { Component, ElementRef, Renderer2, ViewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MessagesService } from '../../../../../../services/messages.service';
import { getCurrentUser, setSessionStorage } from '../../../../../../config/authUser';
import { Subscription } from 'rxjs';
import { apiUrl } from '../../../../../../config/config';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LoadinganimationComponent } from "../../../../components/loadinganimation/loadinganimation.component";
import { InfodialogComponent } from "../../../../components/infodialog/infodialog.component";

@Component({
  selector: 'app-group-chat',
  imports: [CommonModule, FormsModule, LoadinganimationComponent, RouterModule, InfodialogComponent],
  templateUrl: './group-chat.component.html',
  styleUrl: './group-chat.component.css'
})
export class GroupChatComponent {
  apiUrl = apiUrl;
  groupId!: string;
  userUid!: string | null;
  userName: string | null = null;
  userImageUrl: string | null = null;
  userAdmin: boolean = false;
  userHasLeft: boolean = false;
  groupName: string | null = null;
  groupImageUrl: string | null = null;
  loadingGroupInfo: boolean = true;
  loadingSendMessage: boolean = false;
  noMessagesFound: boolean = true;

  showAlertDialog: boolean = false;
  groupSelected: any | null = null;

  messagesLimit: number = 20;
  messagesOffset: number = 0;
  loadingMore: boolean = false;
  hasMoreMessages: boolean = true;
  loadingMessages: boolean = false;
  messages: any[] = [];
  messagesSelected: any[] = [];
  selectedMessage: any | null = null;
  canDeleteMessagesOption: boolean = false;
  deleteOnlyOne: any | null = null;

  generalError: string | null = null;
  messageInput: string = '';

  showMessageActions: string = '';
  showMessageActionMenu: string = '';
  groupActionsMenu: boolean = false;
  groupActionsClosing: boolean = false;
  messageActionsClosing: boolean = false;

  selectedItems: any[] | null = null;
  showDeleteMessageConfirmation: boolean = false;
  private navigatingToMessage: boolean = false;
  private preventAutoScroll: boolean = false;
  visibleNewMessagesBtn: boolean = false;

  private paramSub?: Subscription;
  private subscriptions: Subscription[] = [];

  private touchStartX: number = 0;
  private touchStartY: number = 0;
  private currentSwipeElement: HTMLElement | null = null;
  private maxSwipeDistance: number = 120;
  private swipeMinDistance: number = 40;
  private longPressTimeout: any = null;
  private touchStartTime: number = 0;
  private isMobileDevice: boolean = false;
  private longPressThreshold: number = 500;
  private currentLongPressMessage: string | null = null;
  private longPressDetected: boolean = false;
  private moveThreshold: number = 5;


  @ViewChild('messagesContainer') private messagesContainer!: ElementRef<HTMLElement>;
  @ViewChild('messageTextarea') private messageTextarea!: ElementRef;
  previousHeight: number = 45;
  private textMeasurerEl: HTMLDivElement | null = null;

  constructor(private renderer: Renderer2, private route: ActivatedRoute, public messagesService: MessagesService, private router: Router) {
    // Check if device is mobile
    this.isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  ngOnInit() {
    this.getUserId().then(() => {
      this.paramSub = this.route.paramMap.subscribe(async params => {
        this.groupId = params.get('groupId')!;

        this.messages = [];
        this.noMessagesFound = false;
        this.loadingMessages = true;
        this.hasMoreMessages = true;

        await this.getGroup();

        this.messagesService.connect(
          this.userUid!,
          this.groupId,
          this.messagesLimit
        );
      });

      this.subscriptions.push(
        this.messagesService.messages$.subscribe(msgs => {
          this.messages = msgs;
          const scrollElement = document.querySelector('.messages-list');
          let scrollTop = -10000;
          if (scrollElement) {
            scrollTop = scrollElement.scrollTop;
          }
          if (!this.messagesService.hasMoreRecentMessages && scrollTop >= -500) {
            this.scrollToBottom();
          }
        })
      );

      this.subscriptions.push(
        this.messagesService.loading$.subscribe(loading => {
          this.loadingMessages = loading;
        })
      );

      this.subscriptions.push(
        this.messagesService.hasMoreMessages$.subscribe(hasMore => {
          this.hasMoreMessages = hasMore;
        })
      );

      this.subscriptions.push(
        this.messagesService.noMessagesFound$.subscribe(noMessages => {
          this.noMessagesFound = noMessages;
        })
      );
    });
  }

  ngAfterViewInit() {
    this.textMeasurerEl = this.renderer.createElement('div');
    this.renderer.setStyle(this.textMeasurerEl, 'position', 'absolute');
    this.renderer.setStyle(this.textMeasurerEl, 'top', '-9999px');
    this.renderer.setStyle(this.textMeasurerEl, 'left', '-9999px');
    this.renderer.setStyle(this.textMeasurerEl, 'width', this.messageTextarea.nativeElement.offsetWidth + 'px');
    this.renderer.setStyle(this.textMeasurerEl, 'font-size', '1rem');
    this.renderer.setStyle(this.textMeasurerEl, 'font-family', 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif');
    this.renderer.setStyle(this.textMeasurerEl, 'line-height', '20px');
    this.renderer.setStyle(this.textMeasurerEl, 'padding', '10px 15px');
    this.renderer.setStyle(this.textMeasurerEl, 'box-sizing', 'border-box');
    this.renderer.setStyle(this.textMeasurerEl, 'white-space', 'pre-wrap');
    this.renderer.setStyle(this.textMeasurerEl, 'word-wrap', 'break-word');

    if (this.textMeasurerEl) {
      document.body.appendChild(this.textMeasurerEl);
    }

    if (this.textMeasurerEl) {
      document.body.appendChild(this.textMeasurerEl);
    }
    const queryParams = this.route.snapshot.queryParams;
    if (queryParams['messageId']) {
      this.preventAutoScroll = true;
      const subscription = this.messagesService.loading$.subscribe(loading => {
        if (!loading && this.messages.length > 0) {
          setTimeout(() => {
            this.locateMessage(queryParams['messageId']);
          }, 500);
          subscription.unsubscribe();
        }
      });
    }
  }

  ngOnDestroy() {
    if (!this.messagesService.hasMoreRecentMessages) {
      this.messagesService.markMessagesAsReadAtBottom(this.groupId);
    }
    this.messagesService.disconnect();
    this.messages = [];
    this.paramSub?.unsubscribe();
    this.subscriptions.forEach(s => s.unsubscribe());
    if (this.textMeasurerEl && document.body.contains(this.textMeasurerEl)) {
      document.body.removeChild(this.textMeasurerEl);
    }
  }

  handleTouchStart(event: TouchEvent, messageId: string, message: any) {
    if (!this.isMobileDevice || this.userHasLeft || this.selectedItems) return;
    if (message.status === 'pending' || message.status === 'error' || message.status === 'deleted') return;
    const touch = event.touches[0];
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
    this.touchStartTime = Date.now();
    this.longPressDetected = false;

    const msgElement = (event.target as HTMLElement).closest('.msg');
    if (msgElement) {
      this.currentSwipeElement = msgElement as HTMLElement;
    }

    this.longPressTimeout = setTimeout(() => {
      this.longPressDetected = true;
      this.currentLongPressMessage = messageId;
      this.handleLongPress(event, messageId);
    }, this.longPressThreshold);
  }

  handleTouchMove(event: TouchEvent, messageId: string, message: any) {
    if (!this.isMobileDevice || this.userHasLeft) return;
    if (message.status === 'pending' || message.status === 'deleted') return;

    const touch = event.touches[0];
    const deltaX = touch.clientX - this.touchStartX;
    const deltaY = touch.clientY - this.touchStartY;

    if (Math.abs(deltaX) > this.moveThreshold || Math.abs(deltaY) > this.moveThreshold) {
      this.cancelLongPress();

      if (Math.abs(deltaX) > Math.abs(deltaY) && this.currentSwipeElement) {
        const isUserMessage = message.user.uid === this.userUid;
        if ((isUserMessage && deltaX < 0) || (!isUserMessage && deltaX > 0)) {
          const swipeAmount = Math.min(Math.abs(deltaX), this.maxSwipeDistance);
          if (isUserMessage) {
            this.currentSwipeElement.style.transform = `translateX(-${swipeAmount}px)`;
          } else {
            this.currentSwipeElement.style.transform = `translateX(${swipeAmount}px)`;
          }
          event.preventDefault();
        }
      }
    }
  }

  handleTouchEnd(event: TouchEvent, messageId: string, message: any) {
    if (!this.isMobileDevice) return;

    if (!this.longPressDetected) {
      this.cancelLongPress();
    }

    if (this.longPressDetected) {
      if (this.currentSwipeElement) {
        this.currentSwipeElement.style.transition = 'transform 0.3s ease';
        this.currentSwipeElement.style.transform = 'translateX(0)';

        setTimeout(() => {
          if (this.currentSwipeElement) {
            this.currentSwipeElement.style.transition = '';
            this.currentSwipeElement = null;
          }
        }, 300);
      }
      return;
    }

    if (this.currentSwipeElement) {
      const currentTransform = this.currentSwipeElement.style.transform;
      const match = currentTransform.match(/translateX\(([^)]+)\)/);

      let currentPos = 0;
      if (match) {
        currentPos = parseFloat(match[1]);
        if (currentTransform.includes('-')) {
          currentPos = -currentPos;
        }
      }

      this.currentSwipeElement.style.transition = 'transform 0.3s ease';
      this.currentSwipeElement.style.transform = 'translateX(0)';

      if (Math.abs(currentPos) >= this.swipeMinDistance && message &&
        message.status !== 'pending' && message.status !== 'deleted' && message.status !== 'error') {
        setTimeout(() => {
          this.replyMessage(message);
        }, 300);
      }

      setTimeout(() => {
        if (this.currentSwipeElement) {
          this.currentSwipeElement.style.transition = '';
          this.currentSwipeElement = null;
        }
      }, 300);
    }

    if (this.showMessageActionMenu && !event.target) {
      this.closeMessageActionMenu();
    }
  }

  handleLongPress(event: TouchEvent, messageId: string) {
    if (!this.isMobileDevice || this.userHasLeft) return;
    event.preventDefault();

    const messageElement = document.getElementById(messageId);
    if (messageElement) {
      messageElement.classList.add('long-press-feedback');
      setTimeout(() => {
        messageElement.classList.remove('long-press-feedback');
        const rect = messageElement.getBoundingClientRect();
        this.showMessageActionsMenuForTouch(rect, messageId);
      }, 200);
    }
  }

  showMessageActionsMenuForTouch(rect: DOMRect, messageId: string) {
    const menu = document.querySelector(`.message-item-actions-menu[data-message-id="${messageId}"]`)! as HTMLElement;
    const chat = document.getElementById('chat');
    if (!chat || !menu) return;
    chat.appendChild(menu);
    menu.style.position = 'fixed';
    menu.style.top = `${rect.bottom + 8}px`;
    menu.style.left = `${rect.left + 10}px`;
    menu.style.zIndex = '9999';

    const viewportHeight = window.innerHeight;
    if (rect.top > viewportHeight / 2) {
      menu.style.top = `${rect.top - menu.clientHeight - 8}px`;
    }

    document.addEventListener('click', this.handleOutsideClick);
    document.addEventListener('keydown', this.handleEscKey);
    document.addEventListener('touchstart', this.handleOutsideTouch);

    this.showMessageActionMenu = messageId;
  }

  cancelLongPress() {
    if (this.longPressTimeout) {
      clearTimeout(this.longPressTimeout);
      this.longPressTimeout = null;
    }
    this.longPressDetected = false;
    this.currentLongPressMessage = null;
  }

  handleSwipeToReply(message: any) {
    if (!this.isMobileDevice || this.userHasLeft) return;

    const messageElement = document.getElementById(message.id);
    if (messageElement) {
      messageElement.classList.add('swiped-to-reply');
      setTimeout(() => {
        messageElement.classList.remove('swiped-to-reply');
        this.replyMessage(message);
      }, 300);
    }
  }

  isMobile(): boolean {
    return this.isMobileDevice;
  }

  goBack() {
    this.router.navigate(['/home/groups']);
  }

  showFetchError(message: string) {
    this.generalError = message;
    setTimeout(() => {
      this.generalError = null;
    }, 5000);
  }

  async getGroup() {
    this.loadingGroupInfo = true;
    try {
      const response = await fetch(`${apiUrl}api/grupos/reduced/${this.groupId}`, {
        method: 'GET',
        credentials: 'include'
      });

      const data = await response.json();
      if (response.ok) {
        this.groupName = data.datos.grupo.name;
        this.groupImageUrl = data.datos.grupo.imageUrl;
        this.userAdmin = data.datos.belongsToGroup.admin;
        this.userHasLeft = data.datos.belongsToGroup.joined === -1;
      } else {
        this.showFetchError(data.mensaje);
      }
    } catch (error: any) {
      this.showFetchError('Error al cargar los datos del grupo: ' + error.message);
    } finally {
      this.loadingGroupInfo = false;
    }
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

  async focusTextarea() {
    const chat = document.getElementById('chat');
    const textarea = document.querySelector('textarea');
    if (textarea) {
      textarea.focus();
      setTimeout(() => {
        textarea.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'nearest'
        });
        setTimeout(() => {
          if (chat) {
            chat.scrollTop = 0;
          }
        }, 1000);
      }, 200);
    }

  }

  async onScroll(event: any): Promise<void> {
    if (this.navigatingToMessage || this.preventAutoScroll || this.messagesService.isAutoLoadBlocked) return;

    const element = event.target;
    const scrollTop = element.scrollTop;
    const scrollHeight = element.scrollHeight;
    const clientHeight = element.clientHeight;

    const nearTop = scrollHeight + scrollTop <= clientHeight + 50;
    const nearBottom = scrollTop >= -50;

    if (this.loadingMore || this.loadingMessages) return;

    if (nearTop && this.messagesService.hasMoreOlderMessages) {
      this.loadingMore = true;

      try {
        await this.messagesService.loadMoreMessages();
      } catch (error: any) {
        this.showFetchError('Error al cargar más mensajes: ' + error.message);
      } finally {
        this.loadingMore = false;
      }
    }

    if (nearBottom && this.messagesService.hasMoreRecentMessages) {
      this.loadingMore = true;

      try {
        await this.messagesService.loadMoreRecentMessages();
        setTimeout(() => {
          const newScrollHeight = element.scrollHeight;
          const newScrollTop = scrollHeight - newScrollHeight;
          element.scrollTop = newScrollTop - 50;
        }, 50);
      } catch (error: any) {
        this.showFetchError('Error al cargar más mensajes recientes: ' + error.message);
      } finally {
        this.loadingMore = false;
      }
    }

    if (scrollTop === 0 && !this.messagesService.hasMoreRecentMessages) {
      this.messagesService.markMessagesAsReadAtBottom(this.groupId);
    }

    if (scrollTop <= -1000) {
      this.visibleNewMessagesBtn = true;
    } else if (scrollTop > -500) {
      this.visibleNewMessagesBtn = false;
    }
  }

  showMessageActionsButton(messageId: string) {
    if (this.isMobileDevice) return;

    if (this.showMessageActions !== '' && this.showMessageActions === messageId) return;
    if (this.userHasLeft) return;
    if (messageId === '') {
      if (this.showMessageActionMenu === '') {
        this.showMessageActionMenu = '';
      }
    }
    this.showMessageActions = messageId;
  }

  displayDate(date: Date): string {
    const currentDate = new Date();
    const messageDate = new Date(date);

    const sameDay =
      currentDate.getDate() === messageDate.getDate() &&
      currentDate.getMonth() === messageDate.getMonth() &&
      currentDate.getFullYear() === messageDate.getFullYear();

    const yesterday =
      currentDate.getDate() - 1 === messageDate.getDate() &&
      currentDate.getMonth() === messageDate.getMonth() &&
      currentDate.getFullYear() === messageDate.getFullYear();

    const sameWeek =
      currentDate.getTime() - messageDate.getTime() < 7 * 24 * 60 * 60 * 1000 &&
      currentDate.getFullYear() === messageDate.getFullYear();

    const sameYear = currentDate.getFullYear() === messageDate.getFullYear();

    const hours = messageDate.getHours().toString().padStart(2, '0');
    const minutes = messageDate.getMinutes().toString().padStart(2, '0');
    const time = `${hours}:${minutes}`;

    const dayNames = ['Dom.', 'Lun.', 'Mar.', 'Mié.', 'Jue.', 'Vie.', 'Sáb.'];
    const monthNames = ['Ene.', 'Feb.', 'Mar.', 'Abr.', 'May.', 'Jun.', 'Jul.', 'Ago.', 'Sep.', 'Oct.', 'Nov.', 'Dic.'];

    if (sameDay) {
      return time;
    } else if (yesterday) {
      return `Ayer ${time}`;
    } else if (sameWeek) {
      return `${dayNames[messageDate.getDay()]} ${messageDate.getDate()} ${time}`;
    } else if (sameYear) {
      return `${dayNames[messageDate.getDay()]} ${messageDate.getDate()} ${monthNames[messageDate.getMonth()]} ${time}`;
    } else {
      return `${dayNames[messageDate.getDay()]} ${messageDate.getDate()} ${monthNames[messageDate.getMonth()]} ${messageDate.getFullYear()} ${time}`;
    }
  }

  showGroupActionMenu(event: any) {
    event.stopPropagation();
    this.groupActionsMenu = true;
    setTimeout(() => {
      document.addEventListener('click', this.handleOutsideClick);
      document.addEventListener('keydown', this.handleEscKey);
      if (this.isMobileDevice) {
        document.addEventListener('touchstart', this.handleOutsideTouch);
      }
    }, 0);
  }

  handleOutsideTouch = (event: TouchEvent) => {
    const menuElement = document.querySelector('.group-item-actions-menu');
    const messageMenuElement = document.querySelector('.message-item-actions-menu');

    if (menuElement && !menuElement.contains(event.target as Node)) {
      this.closeGroupActionMenu();
    }
    if (messageMenuElement && !messageMenuElement.contains(event.target as Node)) {
      setTimeout(() => {
        this.closeMessageActionMenu();
      }, 200);
    }
  }

  showMessageActionsMenu(event: MouseEvent, messageId: string) {
    event.stopPropagation();
    if (this.showMessageActionMenu === messageId) {
      this.closeMessageActionMenu();
      return;
    }
    const clickedElement = event.target as HTMLElement;

    const clickedEl = (event.target as HTMLElement).closest('.message-actions') || clickedElement;
    const rect = clickedEl.getBoundingClientRect();

    const menu = document.querySelector(`.message-item-actions-menu[data-message-id="${messageId}"]`)! as HTMLElement;
    const chat = document.getElementById('chat');
    if (chat) {
      chat.appendChild(menu);
    } else {
      console.error('Chat element not found');
      return;
    }

    menu.style.position = 'fixed';
    menu.style.top = `${rect.bottom + 8}px`;
    menu.style.left = `${rect.left}px`;
    menu.style.zIndex = '9999';

    setTimeout(() => {
      const menuElement = document.querySelector(`.message-item-actions-menu[data-message-id="${messageId}"]`);
      if (menuElement) {
        const rect = clickedElement.getBoundingClientRect();
        const viewportHeight = window.innerHeight;

        if (rect.top > viewportHeight / 2) {
          menu.style.top = `${rect.top - menuElement.clientHeight - 8}px`;
        } else {
          menu.style.top = `${rect.bottom + 8}px`;
        }
      }

      document.addEventListener('click', this.handleOutsideClick);
      document.addEventListener('keydown', this.handleEscKey);
      if (this.isMobileDevice) {
        document.addEventListener('touchstart', this.handleOutsideTouch);
      }
    }, 0);

    this.showMessageActionMenu = messageId;
  }

  handleOutsideClick = (event: MouseEvent) => {
    const menuElement = document.querySelector('.group-item-actions-menu');
    const messageMenuElement = document.querySelector('.message-item-actions-menu');
    if (menuElement && !menuElement.contains(event.target as Node)) {
      this.closeGroupActionMenu();
    }
    if (messageMenuElement && !messageMenuElement.contains(event.target as Node)) {
      setTimeout(() => {
        this.closeMessageActionMenu();
      }, 200);
    }
  }

  handleEscKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      this.closeGroupActionMenu();
      this.closeMessageActionMenu();
    }
  }

  closeMessageActionMenu() {
    if (this.messageActionsClosing) return;

    this.messageActionsClosing = true;
    document.removeEventListener('click', this.handleOutsideClick);
    document.removeEventListener('keydown', this.handleEscKey);
    if (this.isMobileDevice) {
      document.removeEventListener('touchstart', this.handleOutsideTouch);
    }
    const menuElement = document.querySelector('.message-item-actions-menu-show');
    if (menuElement) {
      this.renderer.addClass(menuElement, 'message-item-actions-menu-close');
    }
    setTimeout(() => {
      this.showMessageActionMenu = '';
      this.messageActionsClosing = false;
    }, 200);
  }

  closeGroupActionMenu() {
    if (this.groupActionsClosing) return;

    this.groupActionsClosing = true;
    document.removeEventListener('click', this.handleOutsideClick);
    document.removeEventListener('keydown', this.handleEscKey);
    if (this.isMobileDevice) {
      document.removeEventListener('touchstart', this.handleOutsideTouch);
    }
    const menuElement = document.querySelector('.group-item-actions-menu-show');
    if (menuElement) {
      this.renderer.addClass(menuElement, 'group-item-actions-menu-close');
    }
    setTimeout(() => {
      this.groupActionsMenu = false;
      this.groupActionsClosing = false;
    }, 200);
  }

  replyMessage(message: any) {
    this.selectedMessage = message;
    this.closeMessageActionMenu();
    const textarea = this.messageTextarea.nativeElement;
    textarea.focus();
    setTimeout(() => {
      textarea.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest'
      });
    }, 500);
  }

  handleCheckboxChange(message: any, event: any) {
    event.stopPropagation();
    if (this.userHasLeft) return;
    message.checked = !message.checked;
    this.selectItems(message);
  }

  selectItems(message: any, clickBeforeInicialization: boolean = false) {
    if (clickBeforeInicialization && !this.selectedItems) return;
    if (this.userHasLeft) return;
    if (!message) {
      this.closeGroupActionMenu();
      if (!this.selectedItems) {
        this.selectedItems = [];
        this.canDeleteMessagesOption = true;
      } else {
        if (this.selectedItems.length > 0) {
          this.selectedItems.forEach(item => item.checked = false);
        }
        this.selectedItems = null;
      }
      return;
    }

    if (message.status) return;

    if (!this.selectedItems) {
      this.selectedItems = [];
    }
    const existingIndex = this.selectedItems.findIndex(item => item.id === message.id);
    if (existingIndex !== -1) {
      message.checked = false;
      this.selectedItems.splice(existingIndex, 1);
    } else {
      message.checked = true;
      this.selectedItems.push(message);
    }
    if (this.selectedItems.length === 0 && clickBeforeInicialization) {
      this.selectedItems = null;
    }
    this.canDeleteMessages();
  }

  stopSelectingItems(event: any) {
    event.stopPropagation();
    if (this.selectedItems) {
      this.selectedItems.forEach(item => item.checked = false);
      this.selectedItems = null;
    }
    this.showDeleteMessageConfirmation = false;
  }

  async locateMessage(messageId: string) {
    if (!messageId || this.selectedItems) return;

    if (this.navigatingToMessage) return;

    this.navigatingToMessage = true;

    try {
      const messageIndex = this.messages.findIndex(msg => msg.id === messageId);

      if (messageIndex !== -1) {
        this.highlightMessage(messageId);
      } else {
        this.loadingMessages = true;

        try {
          const { success, messageIndex } = await this.messagesService.loadMessageContext(messageId);

          if (success && messageIndex >= 0) {
            setTimeout(() => {
              this.highlightMessage(messageId);
            }, 300);
          } else {
            this.showFetchError('No se pudo cargar el mensaje referenciado.');
          }

          this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { messageId: null },
            queryParamsHandling: 'merge',
            replaceUrl: true
          });

        } catch (error: any) {
          this.showFetchError('Error al cargar el mensaje referenciado: ' + error.message);
        } finally {
          this.loadingMessages = false;
        }
      }
    } finally {
      setTimeout(() => {
        this.navigatingToMessage = false;
      }, 500);
    }
  }

  private highlightMessage(messageId: string) {
    try {
      const messageElement = document.getElementById(messageId);
      if (!messageElement) return;
      messageElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
      messageElement.classList.add('highlighted-message');
      setTimeout(() => {
        messageElement.classList.add('active');
        setTimeout(() => {
          messageElement.classList.remove('active');
          setTimeout(() => {
            messageElement.classList.remove('highlighted-message');
          }, 300);
        }, 1500);
      }, 100);
      this.preventAutoScroll = true;
      setTimeout(() => {
        this.preventAutoScroll = false;
      }, 200);
    } catch (error) {
      console.error("Error al resaltar mensaje:", error);
    }
  }

  private scrollToBottom(forceScroll: boolean = false): void {
    if ((this.navigatingToMessage || this.preventAutoScroll) && !forceScroll) return;

    try {
      const el = this.messagesContainer.nativeElement;
      el.scrollTo({
        top: el.scrollHeight,
        behavior: 'smooth'
      });
    } catch (error) {
      console.error("Error en scrollToBottom:", error);
    }
  }

  scrollToBottomOnBtnClick($event: any) {
    $event.preventDefault();
    if (this.messagesService.hasMoreRecentMessages) {
      this.visibleNewMessagesBtn = false;
      this.messagesService.loadMessages();
    } else {
      this.scrollToBottom(true);
    }
  }

  autoGrowTextarea() {
    if (!this.messageTextarea?.nativeElement || !this.textMeasurerEl) return;

    const chat = document.getElementById('chat');
    const textarea = this.messageTextarea.nativeElement;
    const text = this.messageInput || '';
    this.textMeasurerEl.innerHTML = text
      .replace(/\n/g, '<br>')
      .replace(/\s/g, '&nbsp;') || '<br>';
    const textHeight = this.textMeasurerEl.offsetHeight;
    const minHeight = 45;
    const maxHeight = 120;
    const newHeight = Math.max(minHeight, Math.min(textHeight, maxHeight));
    textarea.style.height = newHeight + 'px';
    const messageInputContainer = textarea.closest('.message-input');
    if (messageInputContainer) {
      const baseHeight = 60;
      const extraHeight = newHeight - minHeight;
      messageInputContainer.style.minHeight = (baseHeight + extraHeight) + 'px';
    }
    textarea.style.overflowY = textHeight > maxHeight ? 'auto' : 'hidden';
    if (chat) {
      chat.scrollTop = 0;
    }
  }

  async sendMessage(event: any) {
    event.preventDefault();
    if (this.userHasLeft) return;
    this.loadingSendMessage = true;

    this.navigatingToMessage = false;
    this.preventAutoScroll = false;

    const formData = new FormData();
    formData.append('type', 'text');
    formData.append('content', this.messageInput);
    if (this.selectedMessage) {
      formData.append('reference', this.selectedMessage.id);
    }

    const tempId = 'temp-' + Date.now();
    const temporalMessage = {
      id: tempId,
      content: this.messageInput,
      type: 'text',
      user: {
        uid: this.userUid,
        username: this.userName,
        imageUrl: this.userImageUrl
      },
      datetime: new Date(),
      status: 'pending',
      reference: this.selectedMessage ? this.selectedMessage.id : null,
      reference_message: this.selectedMessage ? {
        id: this.selectedMessage.id,
        type: this.selectedMessage.type,
        content: this.selectedMessage.content,
        user_user: this.selectedMessage.user
      } : null
    }

    setTimeout(() => {
      if (!this.messagesService.hasMoreRecentMessages) {
        this.scrollToBottom(true);
      }
      this.autoGrowTextarea();
    }, 0);

    const tempMessageInput = this.messageInput;
    const tempSelectedMessage = this.selectedMessage;
    this.messageInput = '';
    this.selectedMessage = null;

    try {
      const ok = await this.messagesService.sendMessage(formData, temporalMessage);
      if (!ok) {
        if (!this.messagesService.hasMoreRecentMessages) {
          this.messages = this.messages.map(msg => {
            if (msg.id === tempId) {
              return { ...msg, status: 'error' };
            }
            return msg;
          });
        }
        this.messageInput = tempMessageInput;
        this.selectedMessage = tempSelectedMessage;
        this.autoGrowTextarea();
        this.showFetchError('Hubo un error al enviar el mensaje.');
      } else {
        if (!this.messagesService.hasMoreRecentMessages) {
          this.messages = this.messages.filter(msg => msg.id !== tempId);
          setTimeout(() => {
            this.scrollToBottom(true);
          }, 0);
        }
      }
    } catch (error: any) {
      if (!this.messagesService.hasMoreRecentMessages) {
        this.messages = this.messages.map(msg => {
          if (msg.id === tempId) {
            return { ...msg, status: 'error' };
          }
          return msg;
        });
      }
      this.messageInput = tempMessageInput;
      this.selectedMessage = tempSelectedMessage;
      this.autoGrowTextarea();
      this.showFetchError('Hubo un error al enviar el mensaje: ' + error.message);
    }
    this.loadingSendMessage = false;
  }

  async featureMessage(event: any, message: any) {
    event.preventDefault();
    if (this.userHasLeft) return;
    try {
      const response = await this.messagesService.featureMessage(message);
    } catch (error: any) {
      this.showFetchError('Error al destacar el mensaje: ' + error.message);
    }
  }

  canDeleteMessages(): void {
    if (!this.selectedItems) {
      this.canDeleteMessagesOption = false;
      return;
    }

    const isNotAuthor = this.selectedItems.some(item => item.user.uid !== this.userUid);

    if (isNotAuthor) {
      if (this.userAdmin) {
        this.canDeleteMessagesOption = true;
      } else {
        this.canDeleteMessagesOption = false;
      }
      return;
    }

    this.canDeleteMessagesOption = true;
  }

  showDialogDeleteMessageConfirmation(event: any, oneMessage: any | null = null) {
    event.preventDefault();
    if (this.userHasLeft) return;
    this.showDeleteMessageConfirmation = true;
    this.deleteOnlyOne = oneMessage;
  }

  async deleteMessages(event: any) {
    event.preventDefault();
    let messagesToDelete: any[] = [];
    if (!this.selectedItems) {
      if (this.deleteOnlyOne) {
        messagesToDelete = [{
          id: this.deleteOnlyOne.id,
          user: this.deleteOnlyOne.user.uid,
          groups: this.groupId
        }];
      } else {
        return;
      }
    } else {
      messagesToDelete = this.selectedItems!
        .filter(item => item.checked)
        .map(item => ({
          id: item.id,
          user: item.user.uid,
          groups: this.groupId
        }));
      this.selectedItems!.forEach(item => item.checked = false);
      this.selectedItems = null;
    }

    this.showDeleteMessageConfirmation = false;
    try {
      const response = await this.messagesService.deleteMessages(messagesToDelete);
      if (!response.ok) {
        if (response.adminError) {
          this.showFetchError('No posees permisos de administrador para eliminar mensajes de otros usuarios.');
        } else {
          this.showFetchError('Hubo un error al eliminar los mensajes.');
        }
      }
    } catch (error: any) {
      this.showFetchError('Error al eliminar mensajes: ' + error.message);
    }
  }

  showAlertDialogFunction(event: any, groupId: any | null) {
    event.stopPropagation();
    this.showAlertDialog = !this.showAlertDialog;
    this.groupSelected = groupId;
  }

  async leaveGroup(event: any): Promise<void> {
    event.preventDefault();
    try {
      const response = await fetch(`${apiUrl}api/grupos/leave/${this.groupSelected}`, {
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
}