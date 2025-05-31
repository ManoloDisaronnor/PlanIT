import { Component } from '@angular/core';
import { UsereventsinfoComponent } from "../COMPONENTS/usereventsinfo/usereventsinfo.component";
import { CommonModule } from '@angular/common';
import { getCurrentUser, setSessionStorage } from '../../../../../../config/authUser';
import { LoadinganimationComponent } from "../../../../components/loadinganimation/loadinganimation.component";
import { apiUrl } from '../../../../../../config/config';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-personal-events',
  imports: [UsereventsinfoComponent, CommonModule, LoadinganimationComponent, RouterLink],
  templateUrl: './personal-events.component.html',
  styleUrl: './personal-events.component.css'
})
export class PersonalEventsComponent {
  userUid!: string;
  apiUrl = apiUrl;

  alreadyOverFutureEvents = false;
  alreadyOverPastEvents = false;
  alreadyOverOnGoingEvents = false;

  futureEvents: any[] = [];
  futureEventsExpanded = false;
  futureEventsLoading = false;
  futureEventsLoadingMore = false;
  noMoreFutureEvents = false;
  futureEventsOffset = 0;
  futureEventsLimit = 5;
  pastEvents: any[] = [];
  pastEventsExpanded = false;
  pastEventsLoading = false;
  pastEventsLoadingMore = false;
  noMorePastEvents = false;
  pastEventsOffset = 0;
  pastEventsLimit = 5;
  onGoingEvents: any[] = [];
  onGoingEventsExpanded = false;
  onGoingEventsLoading = false;
  onGoingEventsLoadingMore = false;
  noMoreOnGoingEvents = false;
  onGoingEventsOffset = 0;
  onGoingEventsLimit = 5;
  generalError: string | null = null;

  async ngOnInit() {
    await this.getUserId();
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
        } else {
          console.error('User data not found in session storage.');
        }
      } else {
        console.error('No user is currently logged in.');
      }
    }
  }

  toggleFutureEvents(event: any) {
    event.stopPropagation();
    this.futureEventsExpanded = !this.futureEventsExpanded;
  }

  togglePastEvents(event: any) {
    event.stopPropagation();
    this.pastEventsExpanded = !this.pastEventsExpanded;
  }

  toggleOnGoingEvents(event: any) {
    event.stopPropagation();
    this.onGoingEventsExpanded = !this.onGoingEventsExpanded;
  }

  firstLoadFutureEventsOver() {
    if (this.alreadyOverFutureEvents) return;
    this.alreadyOverFutureEvents = true;
    this.loadFutureEvents();
  }

  firstLoadPastEventsOver() {
    if (this.alreadyOverPastEvents) return;
    this.alreadyOverPastEvents = true;
    this.loadPastEvents();
  }

  firstLoadOnGoingEventsOver() {
    if (this.alreadyOverOnGoingEvents) return;
    this.alreadyOverOnGoingEvents = true;
    this.loadOnGoingEvents();
  }

  showFetchInformation(error: string) {
    this.generalError = error;
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

  async onFutureEventsScroll(event: any) {
    const element = event.target;
    const atBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 1;
    if (atBottom && !this.futureEventsLoading && !this.noMoreFutureEvents) {
      await this.loadFutureEvents();
    }
  }

  async onPastEventsScroll(event: any) {
    const element = event.target;
    const atBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 1;
    if (atBottom && !this.pastEventsLoading && !this.noMorePastEvents) {
      await this.loadPastEvents();
    }
  }

  async onOnGoingEventsScroll(event: any) {
    const element = event.target;
    const atBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 1;
    if (atBottom && !this.onGoingEventsLoading && !this.noMoreOnGoingEvents) {
      await this.loadOnGoingEvents();
    }
  }

  async loadFutureEvents() {
    if (this.futureEventsLoading || this.noMoreFutureEvents) return;

    this.futureEventsLoading = true;
    this.futureEventsLoadingMore = true;
    try {
      const response = await fetch(`${this.apiUrl}api/events/future?offset=${this.futureEventsOffset}&limit=${this.futureEventsLimit}`, {
        method: 'GET',
        credentials: 'include'
      });

      const data = await response.json();
      if (response.ok) {
        const newFutureEvents = data.datos;

        this.futureEvents = [...this.futureEvents, ...newFutureEvents];
        this.futureEventsOffset += newFutureEvents.length;

        if (newFutureEvents.length < this.futureEventsLimit) {
          this.noMoreFutureEvents = true;
        }
      } else {
        this.showFetchInformation('Error al cargar eventos futuros: ' + data.mensaje);
      }

    } catch (error: any) {
      this.showFetchInformation('Error al cargar eventos futuros: ' + error.message);
    }
    this.futureEventsLoading = false;
    this.futureEventsLoadingMore = false;
  }

  async loadPastEvents() {
    if (this.pastEventsLoading || this.noMorePastEvents) return;

    this.pastEventsLoading = true;
    this.pastEventsLoadingMore = true;
    try {
      const response = await fetch(`${this.apiUrl}api/events/past?offset=${this.pastEventsOffset}&limit=${this.pastEventsLimit}`, {
        method: 'GET',
        credentials: 'include'
      });

      const data = await response.json();
      if (response.ok) {
        const newPastEvents = data.datos;

        this.pastEvents = [...this.pastEvents, ...newPastEvents];
        this.pastEventsOffset += newPastEvents.length;

        if (newPastEvents.length < this.pastEventsLimit) {
          this.noMorePastEvents = true;
        }
      } else {
        this.showFetchInformation('Error al cargar eventos pasados: ' + data.mensaje);
      }
    } catch (error: any) {
      this.showFetchInformation('Error al cargar eventos pasados: ' + error.message);
    }
    this.pastEventsLoading = false;
    this.pastEventsLoadingMore = false;
  }

  async loadOnGoingEvents() {
    if (this.onGoingEventsLoading || this.noMoreOnGoingEvents) return;

    this.onGoingEventsLoading = true;
    this.onGoingEventsLoadingMore = true;
    try {
      const response = await fetch(`${this.apiUrl}api/events/ongoing?offset=${this.onGoingEventsOffset}&limit=${this.onGoingEventsLimit}`, {
        method: 'GET',
        credentials: 'include'
      });

      const data = await response.json();
      if (response.ok) {
        const newOnGoingEvents = data.datos;

        this.onGoingEvents = [...this.onGoingEvents, ...newOnGoingEvents];
        this.onGoingEventsOffset += newOnGoingEvents.length;

        if (newOnGoingEvents.length < this.onGoingEventsLimit) {
          this.noMoreOnGoingEvents = true;
        }
      } else {
        this.showFetchInformation('Error al cargar eventos en curso: ' + data.mensaje);
      }
    } catch (error: any) {
      this.showFetchInformation('Error al cargar eventos en curso: ' + error.message);
    }
    this.onGoingEventsLoading = false;
    this.onGoingEventsLoadingMore = false;
  }
}
