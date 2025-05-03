import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { apiUrl } from '../../../../../../config/config';
import { LoadinganimationComponent } from '../../../../components/loadinganimation/loadinganimation.component';
import { InfodialogComponent } from "../../../../components/infodialog/infodialog.component";
import { getCurrentUser, setSessionStorage } from '../../../../../../config/authUser';

@Component({
  selector: 'app-friends',
  imports: [CommonModule, LoadinganimationComponent, InfodialogComponent],
  templateUrl: './friends.component.html',
  styleUrl: './friends.component.css'
})
export class FriendsComponent {
  searchUser: string = '';

  friendsExpanded: boolean = true;
  allUsersExpanded: boolean = false;

  friendsList: any[] = [];
  allUsersList: any[] = [];

  friendsLoading: boolean = false;
  friendsOffset: number = 0;
  friendsLimit: number = 5;
  noMoreFriends: boolean = false;
  loadingFriendRequest: string = '';

  allUsersLoading: boolean = false;
  allUsersOffset: number = 0;
  allUsersLimit: number = 5;
  noMoreAllUsers: boolean = false;

  apiUrl: string = apiUrl;
  generalError: string | null = null;
  userUid: string | null = null;

  async ngOnInit() {
    await this.getUserId();
    await this.fetchFriends();
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

  async fetchFriends(reset: boolean = false, reloaded: boolean = false): Promise<void> {
    if (this.friendsLoading || this.noMoreFriends && !reloaded) return;

    this.friendsLoading = true;
    try {
      // Ajusta la URL según tu backend
      const response = await fetch(`${apiUrl}api/friends?limit=${this.friendsLimit}&offset=${this.friendsOffset}`, {
        method: 'GET',
        credentials: 'include'
      });

      const data = await response.json();
      if (response.ok) {
        const newFriends = data.datos;
        console.log('Amigos:', newFriends);

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

  async fetchAllUsers(reset: boolean = false, reloaded: boolean = false): Promise<void> {
    if (this.allUsersLoading || this.noMoreAllUsers && !reloaded) return;

    this.allUsersLoading = true;
    try {
      // Ajusta la URL según tu backend
      const response = await fetch(`${apiUrl}api/usuarios?limit=${this.allUsersLimit}&offset=${this.allUsersOffset}&search=${this.searchUser}`, {
        method: 'GET',
        credentials: 'include'
      });

      const data = await response.json();
      if (response.ok) {
        const newUsers = data.datos;

        if (reset) {
          this.allUsersList = newUsers;
          this.allUsersOffset = newUsers.length;
        } else {
          this.allUsersList = [...this.allUsersList, ...newUsers];
          this.allUsersOffset += newUsers.length;
        }

        if (newUsers.length < this.allUsersLimit) {
          this.noMoreAllUsers = true;
        }
      }
    } catch (error) {
      this.showFetchError('Error al cargar usuarios:' + error);
    } finally {
      this.allUsersLoading = false;
    }
  }

  async reloadComponent() {
    await this.fetchFriends(false, true);
  }

  onAllUsersScroll(event: any): void {
    const element = event.target;
    // Verifica si el scroll está cerca del final del contenedor
    const atBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 1;

    if (atBottom && !this.allUsersLoading && !this.noMoreAllUsers) {
      this.fetchAllUsers();
    }
  }

  onSearchUserChange(event: any) {
    this.searchUser = event.target.value;
    console.log(this.searchUser);

    if (this.allUsersExpanded) {
      this.allUsersOffset = 0;
      this.allUsersList = [];
      this.noMoreAllUsers = false;
      this.fetchAllUsers(true);
    }
  }

  toggleFriends() {
    this.friendsExpanded = !this.friendsExpanded;
  }

  toggleAllUsers() {
    this.allUsersExpanded = !this.allUsersExpanded;
  }

  showFetchError(message: string) {
    this.generalError = message;
    setTimeout(() => {
      this.generalError = null;
    }, 5000);
  }

  async sendFriendRequest(requested: string) {
    this.loadingFriendRequest = requested;
    try {
      const response = await fetch(`${apiUrl}api/friends/request`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requested: requested
        })
      });

      const data = await response.json();
      if (response.ok) {
        this.allUsersList.map((user) => {
          if (user.uid === requested) {
            user.requested = true;
          }
        });
      } else {
        this.showFetchError(data.mensaje);
      }
    } catch (error) {
      this.showFetchError('Error al enviar la solicitud de amistad:' + error);
    }
    this.loadingFriendRequest = '';
  }
}
