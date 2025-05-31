import { Component } from '@angular/core';
import { UsereventsinfoComponent } from "../COMPONENTS/usereventsinfo/usereventsinfo.component";
import { getCurrentUser, setSessionStorage } from '../../../../../../config/authUser';
import { apiUrl } from '../../../../../../config/config';
import { CommonModule } from '@angular/common';
import { InfodialogComponent } from "../../../../components/infodialog/infodialog.component";
import { LoadinganimationComponent } from '../../../../components/loadinganimation/loadinganimation.component';
import { ScrollService } from '../../../../../../services/scroll-service';
import { Subscription } from 'rxjs';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-owned-events',
  imports: [UsereventsinfoComponent, CommonModule, InfodialogComponent, LoadinganimationComponent, RouterLink],
  templateUrl: './owned-events.component.html',
  styleUrl: './owned-events.component.css'
})
export class OwnedEventsComponent {
  apiUrl = apiUrl;
  userUid!: string;
  username!: string;
  userImageUrl!: string;

  eventsOffset = 0;
  eventsLimit = 5;
  events: any[] = [];
  eventsLoading = false;
  eventsLoadingMore = false;
  noMoreEvents = false;
  generalError: string | null = null;

  private scrollSubscription?: Subscription;

  constructor(private scrollService: ScrollService) {}

  async ngOnInit() {
    await this.getUserId().then(async () => {
      await this.getCreatedEvents();
    });

    this.scrollSubscription = this.scrollService.atBottom$.subscribe(atBottom => {
      if (atBottom) {
        this.onReachedBottom();
      }
    });
  }

  async getUserId(): Promise<void> {
    const user = sessionStorage.getItem('user');
    if (user) {
      const userData = JSON.parse(user);
      this.userUid = userData.uid;
      this.username = userData.username;
      this.userImageUrl = userData.imageUrl;
    } else {
      const firebaseUser = await getCurrentUser();
      if (firebaseUser) {
        await setSessionStorage(firebaseUser.uid);
        const user = sessionStorage.getItem('user');
        if (user) {
          const userData = JSON.parse(user);
          this.userUid = userData.uid;
          this.username = userData.username;
          this.userImageUrl = userData.imageUrl;
        }
      }
    }
  }

  async getCreatedEvents() {
    if (this.eventsLoading || this.noMoreEvents) return;

    this.eventsLoading = true;
    try {
      const response = await fetch(`${apiUrl}api/events/created?limit=${this.eventsLimit}&offset=${this.eventsOffset}`, {
        method: 'GET',
        credentials: 'include'
      });

      const data = await response.json();
      if (response.ok) {
        const newEvents = data.datos;

        this.events = [...this.events, ...newEvents];
        this.eventsOffset += newEvents.length;

        if (newEvents.length < this.eventsLimit) {
          this.noMoreEvents = true;
        }
      }
    } catch (error) {
      this.showFetchError('Error al cargar amigos: ' + error);
    } finally {
      this.eventsLoading = false;
    }
  }

  onReachedBottom() {
    if (this.eventsLoading || this.noMoreEvents || this.eventsLoadingMore) return;

    this.eventsLoadingMore = true;
    this.getCreatedEvents().finally(() => {
      this.eventsLoadingMore = false;
    });
  }

  showFetchError(message: string) {
    this.generalError = message;
    setTimeout(() => {
      this.generalError = null;
    }, 5000);
  }

  formatDates(startDateString: string, endDateString: string): { startDate: string, endDate: string | null } {
    const eventStartDate = new Date(startDateString);
    const eventEndDate = new Date(endDateString);
    const now = new Date();
    const startTimeDiff = eventStartDate.getTime() - now.getTime();
    const endTimeDiff = eventEndDate.getTime() - now.getTime();

    if (endTimeDiff < 0) {
      return {
        startDate: 'Finalizado',
        endDate: null
      };
    }

    if (startTimeDiff < 0 && endTimeDiff > 0) {
      return {
        startDate: 'En curso',
        endDate: this.formatSingleDate(endDateString)
      };
    }

    return {
      startDate: this.formatSingleDate(startDateString),
      endDate: this.formatSingleDate(endDateString)
    };
  }

  private formatSingleDate(dateString: string): string {
    const eventDate = new Date(dateString);
    const now = new Date();
    const timeDiff = eventDate.getTime() - now.getTime();

    if (timeDiff > 0 && timeDiff < 24 * 60 * 60 * 1000) {
      const hours = Math.floor(timeDiff / (1000 * 60 * 60));
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
      
      return `Quedan ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    if (window.innerWidth < 768) {
      const day = eventDate.getDate().toString().padStart(2, '0');
      const month = (eventDate.getMonth() + 1).toString().padStart(2, '0');
      const year = eventDate.getFullYear().toString().slice(-2);
      
      return `${day}/${month}/${year}`;
    }

    const daysOfWeek = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                   'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    const dayName = daysOfWeek[eventDate.getDay()];
    const day = eventDate.getDate();
    const month = months[eventDate.getMonth()];
    const year = eventDate.getFullYear();
    const hours = eventDate.getHours().toString().padStart(2, '0');
    const minutes = eventDate.getMinutes().toString().padStart(2, '0');

    return `${dayName}, ${day}, ${month}, ${year} - ${hours}:${minutes}`;
  }
}
