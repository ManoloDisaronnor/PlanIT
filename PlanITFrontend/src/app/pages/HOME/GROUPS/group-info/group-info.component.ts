import { Component } from '@angular/core';
import { apiUrl } from '../../../../../../config/config';
import { getCurrentUser, setSessionStorage } from '../../../../../../config/authUser';
import { debounceTime, distinctUntilChanged, Subject, Subscription } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { LoadinganimationComponent } from "../../../../components/loadinganimation/loadinganimation.component";
import { InfodialogComponent } from "../../../../components/infodialog/infodialog.component";

@Component({
  selector: 'app-group-info',
  imports: [CommonModule, ReactiveFormsModule, FormsModule, LoadinganimationComponent, InfodialogComponent],
  templateUrl: './group-info.component.html',
  styleUrl: './group-info.component.css'
})
export class GroupInfoComponent {
  apiUrl = apiUrl;
  groupId!: string;
  userUid!: string | null;

  loadingGroupInfo: boolean = false;
  groupName!: string;
  groupImageUrl!: string;
  groupDescription!: string;
  groupMembers!: any[];
  userAdmin: boolean = false;

  showAlertDialog: boolean = false;
  showFriendsDialog: boolean = false;
  dialogTitle: string = '';
  dialogDescription: string = '';
  typeButtonPressed: string = '';
  userDialogSelected: string | null = null;

  generalError: string | null = null;

  selectedMembers: any[] = [];
  friendsList: any[] = [];
  friendsLimit: number = 5;
  friendsOffset: number = 0;
  noMoreFriends: boolean = false;
  friendsLoading: boolean = false;
  searchFriend: string = '';

  private searchDebouncer = new Subject<string>();
  private searchSubscription: Subscription;

  loadingFeaturedMessages: boolean = false;
  featuredMessages: any[] = [];
  noFeaturedMessages: boolean = false;
  showFeaturedMessagesDialog: boolean = false;

  groupMembersError: string | null = null;

  private paramSub?: Subscription;

  constructor(private route: ActivatedRoute, public router: Router) {
    this.searchSubscription = this.searchDebouncer.pipe(
      debounceTime(500),
      distinctUntilChanged()
    ).subscribe(searchTerm => {
      this.friendsOffset = 0;
      this.friendsList = [];
      this.noMoreFriends = false;
      this.fetchFriends(true);
    });
  }

  async ngOnInit() {
    this.getUserId().then(() => {
      this.paramSub = this.route.paramMap.subscribe(async params => {
        this.groupId = params.get('groupId')!;

        await this.getGroup();

      });
    });
  }

  ngOnDestroy() {
    this.paramSub?.unsubscribe();
  }

  async fetchFriends(reset: boolean = false, reloaded: boolean = false): Promise<void> {
    if (this.friendsLoading || this.noMoreFriends && !reloaded) return;

    this.friendsLoading = true;
    try {
      const response = await fetch(`${apiUrl}api/friends/group/${this.groupId}?limit=${this.friendsLimit}&offset=${this.friendsOffset}&search=${this.searchFriend}`, {
        method: 'GET',
        credentials: 'include'
      });

      const data = await response.json();
      if (response.ok) {
        const datos = data.datos;
        datos.forEach((friend: any) => {
          if (friend.user_requested === this.userUid) {
            if (this.selectedMembers.find(member => member.id === friend.user_send)) {
              friend.checked = true;
            }
          } else {
            if (this.selectedMembers.find(member => member.id === friend.user_requested)) {
              friend.checked = true;
            }
          }
        });
        const newFriends = datos;

        if (reset) {
          this.friendsList = newFriends;
          this.friendsOffset = newFriends.length;
        } else {
          this.friendsList = [...this.friendsList, ...newFriends];
          this.friendsOffset += newFriends.length;
        }

        if (newFriends.length < this.friendsLimit) {
          this.noMoreFriends = true;
        }
      }
    } catch (error) {
      this.showFetchError('Error al cargar amigos: ' + error);
    } finally {
      this.friendsLoading = false;
    }
  }

  async loadFeaturedMessages() {
    if (this.loadingFeaturedMessages || this.featuredMessages.length > 0) return;
    this.loadingFeaturedMessages = true;
    try {
      const response = await fetch(`${apiUrl}api/mensajes/featured/${this.groupId}`, {
        method: 'GET',
        credentials: 'include'
      });
      const data = await response.json();
      if (response.ok) {
        if (data.datos.length === 0) {
          this.noFeaturedMessages = true;
        } else {
          this.noFeaturedMessages = false;
        }
        this.featuredMessages = data.datos;
      } else {
        this.showFetchError('Error al cargar mensajes destacados: ' + data.mensaje);
      }
    } catch (error: any) {
      this.showFetchError('Error al cargar mensajes destacados: ' + error.message);
    }
    this.loadingFeaturedMessages = false;
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
      const response = await fetch(`${apiUrl}api/grupos/${this.groupId}`, {
        method: 'GET',
        credentials: 'include'
      });

      const data = await response.json();
      if (response.ok) {
        this.groupName = data.datos.grupo.name;
        this.groupImageUrl = data.datos.grupo.imageUrl;
        this.userAdmin = data.datos.groupMembers.some((member: any) => member.user_user.uid === this.userUid && member.admin);
        this.groupDescription = data.datos.grupo.description;
        this.groupMembers = data.datos.groupMembers;
      } else {
        console.error('Error al cargar los datos del grupo:', data.message);
      }
    } catch (error: any) {
      console.error('Error al cargar los datos del grupo:', error.message);
    } finally {
      this.loadingGroupInfo = false;
    }
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

  groupMembersJoinedCount(): number {
    if (this.groupMembers) {
      return this.groupMembers.filter(member => member.joined === 1).length;
    } else {
      return 0;
    }
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

  goBack() {
    this.router.navigate([`/home/groups/chat/${this.groupId}`]);
  }

  showFeaturedMessages(event: any) {
    event.preventDefault();
    this.showFeaturedMessagesDialog = !this.showFeaturedMessagesDialog;
    if (this.featuredMessages.length === 0) {
      this.loadFeaturedMessages();
    }
  }

  showAlertDialogFunction(event: any, typeButton: string, userId: string = this.userUid!) {
    event.preventDefault();
    this.typeButtonPressed = typeButton;
    this.userDialogSelected = userId;
    switch (typeButton) {
      case 'leave':
        this.dialogTitle = '¿Estás seguro de que quieres salir del grupo?';
        this.dialogDescription = 'No podrás volver a acceder a este grupo a menos que te vuelvan a invitar.';
        break;
      case 'kick':
        this.dialogTitle = '¿Estás seguro de que quieres expulsar a este miembro del grupo?';
        this.dialogDescription = 'No podrá volver a acceder a este grupo a menos que le vuelvan a invitar.';
        break;
      case 'promote':
        this.dialogTitle = '¿Estás seguro de que quieres promover a este miembro a administrador?';
        this.dialogDescription = 'Este miembro tendrá los mismos privilegios que tú.';
        break;
      case 'demote':
        this.dialogTitle = '¿Estás seguro de que quieres demover a este miembro de administrador?';
        this.dialogDescription = 'Este miembro perderá los privilegios de administrador.';
        break;
    }
    this.showAlertDialog = true;
  }

  showAddMembers(event: any) {
    event.preventDefault();
    this.showFriendsDialog = !this.showFriendsDialog;
  }

  closeAlertDialog(event: any) {
    event.preventDefault();
    this.showAlertDialog = false;
  }

  async handleAlertDialog(event: any) {
    event.preventDefault();
    switch (this.typeButtonPressed) {
      case 'leave':
        await this.leaveGroup();
        break;
      case 'kick':
        await this.leaveGroup();
        break;
      case 'promote':
        await this.promoteMember();
        break;
      case 'demote':
        await this.promoteMember();
        break;
    }
  }

  async leaveGroup(): Promise<boolean> {
    try {
      const response = await fetch(`${apiUrl}api/grupos/leave/${this.groupId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: this.userDialogSelected
        })
      });

      if (response.ok) {
        if (this.userDialogSelected === this.userUid) {
          this.router.navigate(['/home/groups']);
        } else {
          this.groupMembers = this.groupMembers.map((member: any) => {
            if (member.user_user.uid === this.userDialogSelected) {
              return { ...member, joined: -1 };
            }
            return member;
          });
          this.showAlertDialog = false;
          this.dialogTitle = '';
          this.dialogDescription = '';
          this.typeButtonPressed = '';
          this.userDialogSelected = null;
        }
      } else {
        const data = await response.json();
        this.showAlertDialog = false;
        this.showFetchError('Error al salir del grupo: ' + data.mensaje);
      }

    } catch (error: any) {
      this.showAlertDialog = false;
      this.showFetchError('Error al salir del grupo: ' + error.message);
      return false;
    }
    return true;
  }

  onSearchUserChange(): void {
    this.searchDebouncer.next(this.searchFriend);
  }

  onScroll(event: any): void {
    const element = event.target;
    const atBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 1;

    if (atBottom && !this.friendsLoading && !this.noMoreFriends) {
      this.fetchFriends();
    }
  }

  onFriendSelect(friend: any): void {
    const userId = friend.user_requested !== this.userUid ? friend.user_requested : friend.user_send;
    const user = friend.user_requested !== this.userUid ? friend.user_requested_user : friend.user_send_user;

    if (friend.checked) {
      const existingIndex = this.selectedMembers.findIndex(member =>
        member.id === userId);

      if (existingIndex === -1) {
        this.selectedMembers.push({
          id: userId,
          name: user.name,
          surname: user.surname,
          username: user.username,
          imageUrl: user.imageUrl
        });
      }
    } else {
      this.selectedMembers = this.selectedMembers.filter(member =>
        member.id !== userId);
    }
    if (this.selectedMembers.length > 0) {
      this.groupMembersError = null;
    } else {
      this.groupMembersError = 'Al menos un integrante';
    }
  }

  removeMember(memberId: string): void {
    this.selectedMembers = this.selectedMembers.filter(member =>
      member.id !== memberId);
    this.friendsList.forEach(friend => {
      const friendId = friend.user_requested !== this.userUid ? friend.user_requested : friend.user_send;
      if (friendId === memberId) {
        friend.checked = false;
      }
    });

    if (this.selectedMembers.length === 0) {
      this.groupMembersError = 'Al menos un integrante';
    }
  }

  async addMembers(event: any) {
    event.preventDefault();
    if (this.selectedMembers.length > 0) {
      this.groupMembersError = null;
      try {
        const response = await fetch(`${apiUrl}api/grupos/addmembers/${this.groupId}`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(this.selectedMembers),
        });

        if (response.ok) {
          window.location.reload();
        } else {
          const data = await response.json();
          this.showFriendsDialog = false;
          this.showFetchError('Error al agregar miembros: ' + data.mensaje);
        }

      } catch (error: any) {
        this.showFriendsDialog = false;
        this.showFetchError('Error al agregar miembros: ' + error.message);
      }
    } else {
      this.groupMembersError = 'Al menos un integrante';
    }
  }

  navigateToMessage(event: any, messageId: string) {
    event.preventDefault();
    this.router.navigate([`/home/groups/chat/${this.groupId}`], {
      queryParams: { messageId: messageId }
    });
  }

  async promoteMember() {
    try {
      const response = await fetch(`${apiUrl}api/grupos/toggleadmin/${this.groupId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: this.userDialogSelected
        })
      });

      if (response.ok) {
        this.groupMembers = this.groupMembers.map((member: any) => {
          if (member.user_user.uid === this.userDialogSelected) {
            return { ...member, admin: !member.admin };
          }
          return member;
        });
        this.showAlertDialog = false;
        this.dialogTitle = '';
        this.dialogDescription = '';
        this.typeButtonPressed = '';
        this.userDialogSelected = null;
      } else {
        const data = await response.json();
        this.showAlertDialog = false;
        this.showFetchError('Error al promover miembro: ' + data.mensaje);
      }
    } catch (error: any) {
      this.showAlertDialog = false;
      this.showFetchError('Error al promover miembro: ' + error.message);
    }
  }
}
