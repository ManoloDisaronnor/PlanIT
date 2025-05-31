import { Component } from '@angular/core';
import { getCurrentUser, setSessionStorage } from '../../../../../../../config/authUser';
import { apiUrl } from '../../../../../../../config/config';
import { CommonModule } from '@angular/common';
import { LoadinganimationComponent } from "../../../../../components/loadinganimation/loadinganimation.component";
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-usereventsinfo',
  imports: [CommonModule, LoadinganimationComponent, RouterLink],
  templateUrl: './usereventsinfo.component.html',
  styleUrl: './usereventsinfo.component.css'
})
export class UsereventsinfoComponent {
  apiUrl = apiUrl;
  userUid!: string;
  userName!: string;
  userSurname!: string;
  userUsername!: string;
  userImageUrl!: string;

  recentEvents: any[] = [];
  recentEventsLoading = false;

  userInsignia: any = {
    created: 0,
    joined: 0,
  }

  createdAlreadyRequested = false;
  joinedAlreadyRequested = false;
  showCreatedInsigniaInfo = false;
  showJoinedInsigniaInfo = false;

  async ngOnInit() {
    await this.getUserId().then(async () => {
      await this.getMoreRecentFinishedEvents();
    });
  }

  async getUserId(): Promise<void> {
    const user = sessionStorage.getItem('user');
    if (user) {
      const userData = JSON.parse(user);
      this.userUid = userData.uid;
      this.userName = userData.name;
      this.userSurname = userData.surname;
      this.userUsername = userData.username;
      this.userImageUrl = userData.imageUrl;
    } else {
      const firebaseUser = await getCurrentUser();
      if (firebaseUser) {
        await setSessionStorage(firebaseUser.uid);
        const user = sessionStorage.getItem('user');
        if (user) {
          const userData = JSON.parse(user);
          this.userUid = userData.uid;
          this.userName = userData.name;
          this.userSurname = userData.surname;
          this.userUsername = userData.username;
          this.userImageUrl = userData.imageUrl;
        }
      }
    }
  }

  async showInsigniaInfo(insignia: string) {
    if (insignia === 'created') {
      if (this.userInsignia.created === 0 && !this.createdAlreadyRequested) {
        this.createdAlreadyRequested = true;
        this.userInsignia.created = await this.getInsigniaNumber(insignia);
      }
      this.showCreatedInsigniaInfo = true;
    } else if (insignia === 'joined') {
      if (this.userInsignia.joined === 0 && !this.joinedAlreadyRequested) {
        this.joinedAlreadyRequested = true;
        this.userInsignia.joined = await this.getInsigniaNumber(insignia);
      }
      this.showJoinedInsigniaInfo = true;
    }
  }

  async getInsigniaNumber(insignia: string): Promise<number> {
    try  {
      const response = await fetch(`${apiUrl}api/events/${insignia}/count`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        this.createdAlreadyRequested = false;
        this.joinedAlreadyRequested = false;
        return 0;
      }
      const data = await response.json();
      return data.datos;
    } catch (error) {
      this.createdAlreadyRequested = false;
      this.joinedAlreadyRequested = false;
      console.error('Error fetching insignia number:', error);
      return 0;
    }
  }

  hideInsigniaInfo() {
    this.showCreatedInsigniaInfo = false;
    this.showJoinedInsigniaInfo = false;
  }

  async getMoreRecentFinishedEvents() {
    this.recentEventsLoading = true;
    try {
      const response = await fetch(`${apiUrl}api/events/joined/reduced?limit=3`, {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        this.recentEvents = data.datos;        
      }

    } catch (error) {
      console.error('Error fetching more recent finished events:', error);
    }

    this.recentEventsLoading = false;
  }

  testEndingDate(endingDate: string): boolean {
    const currentDate = new Date();
    const eventDate = new Date(endingDate);
    return currentDate < eventDate;
  }
}
