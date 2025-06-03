import { Component } from '@angular/core';
import { UsereventsinfoComponent } from "../COMPONENTS/usereventsinfo/usereventsinfo.component";
import { CommonModule } from '@angular/common';
import { getCurrentUser, setSessionStorage } from '../../../../../../config/authUser';
import { LoadinganimationComponent } from "../../../../components/loadinganimation/loadinganimation.component";
import { apiUrl } from '../../../../../../config/config';
import { RouterLink } from '@angular/router';

/**
 * Component for displaying and managing personal events for the authenticated user.
 * 
 * Provides three categories of events:
 * - Future events: Events that haven't started yet
 * - Past events: Events that have already ended
 * - Ongoing events: Events currently in progress
 * 
 * Features include:
 * - Infinite scroll loading for each event category
 * - Expandable/collapsible sections for each event type
 * - Real-time date formatting and countdown
 * - Error handling and user feedback
 * 
 * @class PersonalEventsComponent
 * @since 1.0.0
 * @author Manuel Santos Márquez
 * 
 * @example
 * ```typescript
 * // Used in template to display user's personal events
 * <app-personal-events></app-personal-events>
 * ```
 */
@Component({
  selector: 'app-personal-events',
  imports: [UsereventsinfoComponent, CommonModule, LoadinganimationComponent, RouterLink],
  templateUrl: './personal-events.component.html',
  styleUrl: './personal-events.component.css'
})
export class PersonalEventsComponent {  /** Current authenticated user's unique identifier */
  userUid!: string;
  
  /** Base API URL for making HTTP requests */
  apiUrl = apiUrl;

  /** Flag to prevent duplicate initial load for future events */
  alreadyOverFutureEvents = false;
  
  /** Flag to prevent duplicate initial load for past events */
  alreadyOverPastEvents = false;
  
  /** Flag to prevent duplicate initial load for ongoing events */
  alreadyOverOnGoingEvents = false;

  /** Array of future events data */
  futureEvents: any[] = [];
  
  /** Whether future events section is expanded */
  futureEventsExpanded = false;
  
  /** Loading state for future events */
  futureEventsLoading = false;
  
  /** Loading state when fetching more future events */
  futureEventsLoadingMore = false;
  
  /** Whether all future events have been loaded */
  noMoreFutureEvents = false;
  
  /** Pagination offset for future events */
  futureEventsOffset = 0;
  
  /** Number of future events to load per request */
  futureEventsLimit = 5;
  
  /** Array of past events data */
  pastEvents: any[] = [];
  
  /** Whether past events section is expanded */
  pastEventsExpanded = false;
  
  /** Loading state for past events */
  pastEventsLoading = false;
  
  /** Loading state when fetching more past events */
  pastEventsLoadingMore = false;
  
  /** Whether all past events have been loaded */
  noMorePastEvents = false;
  
  /** Pagination offset for past events */
  pastEventsOffset = 0;
  
  /** Number of past events to load per request */
  pastEventsLimit = 5;
  
  /** Array of ongoing events data */
  onGoingEvents: any[] = [];
  
  /** Whether ongoing events section is expanded */
  onGoingEventsExpanded = false;
  
  /** Loading state for ongoing events */
  onGoingEventsLoading = false;
  
  /** Loading state when fetching more ongoing events */
  onGoingEventsLoadingMore = false;
  
  /** Whether all ongoing events have been loaded */
  noMoreOnGoingEvents = false;
  
  /** Pagination offset for ongoing events */
  onGoingEventsOffset = 0;
  
  /** Number of ongoing events to load per request */
  onGoingEventsLimit = 5;
  
  /** Current error message to display to user */
  generalError: string | null = null;
  /**
   * Component initialization lifecycle hook.
   * Retrieves the current user's ID for event filtering.
   * 
   * @returns Promise that resolves when user ID is obtained
   */
  async ngOnInit() {
    await this.getUserId();
  }

  /**
   * Retrieves the current user's ID from session storage or Firebase authentication.
   * Falls back to Firebase auth if session storage is empty.
   * 
   * @returns Promise that resolves when user ID is set
   * @throws Error if user is not authenticated or data cannot be retrieved
   * 
   * @example
   * ```typescript
   * await this.getUserId();
   * console.log(this.userUid); // User's unique identifier
   * ```
   */
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
  /**
   * Toggles the expanded state of the future events section.
   * Prevents event bubbling to avoid unintended interactions.
   * 
   * @param event - The click event object
   * 
   * @example
   * ```typescript
   * // Called from template on button click
   * (click)="toggleFutureEvents($event)"
   * ```
   */
  toggleFutureEvents(event: any) {
    event.stopPropagation();
    this.futureEventsExpanded = !this.futureEventsExpanded;
  }

  /**
   * Toggles the expanded state of the past events section.
   * Prevents event bubbling to avoid unintended interactions.
   * 
   * @param event - The click event object
   */
  togglePastEvents(event: any) {
    event.stopPropagation();
    this.pastEventsExpanded = !this.pastEventsExpanded;
  }

  /**
   * Toggles the expanded state of the ongoing events section.
   * Prevents event bubbling to avoid unintended interactions.
   * 
   * @param event - The click event object
   */
  toggleOnGoingEvents(event: any) {
    event.stopPropagation();
    this.onGoingEventsExpanded = !this.onGoingEventsExpanded;
  }

  /**
   * Initiates first-time loading of future events.
   * Uses flag to prevent duplicate loads on hover events.
   */
  firstLoadFutureEventsOver() {
    if (this.alreadyOverFutureEvents) return;
    this.alreadyOverFutureEvents = true;
    this.loadFutureEvents();
  }

  /**
   * Initiates first-time loading of past events.
   * Uses flag to prevent duplicate loads on hover events.
   */
  firstLoadPastEventsOver() {
    if (this.alreadyOverPastEvents) return;
    this.alreadyOverPastEvents = true;
    this.loadPastEvents();
  }

  /**
   * Initiates first-time loading of ongoing events.
   * Uses flag to prevent duplicate loads on hover events.
   */
  firstLoadOnGoingEventsOver() {
    if (this.alreadyOverOnGoingEvents) return;
    this.alreadyOverOnGoingEvents = true;
    this.loadOnGoingEvents();
  }
  /**
   * Displays error messages to the user for 5 seconds.
   * Automatically clears the error after the timeout.
   * 
   * @param error - The error message to display
   * 
   * @example
   * ```typescript
   * this.showFetchInformation('Failed to load events');
   * // Error will be visible for 5 seconds
   * ```
   */
  showFetchInformation(error: string) {
    this.generalError = error;
    setTimeout(() => {
      this.generalError = null;
    }, 5000);
  }

  /**
   * Formats event start and end dates based on current time.
   * Provides different display formats for various event states.
   * 
   * @param startDateString - ISO string of event start date
   * @param endDateString - ISO string of event end date
   * @returns Object with formatted start and end date strings
   * 
   * @example
   * ```typescript
   * const formatted = this.formatDates('2024-01-15T10:00:00Z', '2024-01-15T18:00:00Z');
   * // Returns: { startDate: 'Lunes, 15, Enero, 2024 - 10:00', endDate: '...' }
   * ```
   */
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

  /**
   * Formats a single date string based on proximity to current time.
   * Shows countdown for events starting within 24 hours, otherwise full date format.
   * Adapts display format based on screen size (mobile vs desktop).
   * 
   * @private
   * @param dateString - ISO string of the date to format
   * @returns Formatted date string
   * 
   * @example
   * ```typescript
   * // For events starting soon
   * this.formatSingleDate('2024-01-15T10:30:00Z'); // "Quedan 02:30:45"
   * 
   * // For regular dates on mobile
   * this.formatSingleDate('2024-01-15T10:00:00Z'); // "15/01/24"
   * 
   * // For regular dates on desktop
   * this.formatSingleDate('2024-01-15T10:00:00Z'); // "Lunes, 15, Enero, 2024 - 10:00"
   * ```
   */
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
  /**
   * Handles scroll events for future events infinite loading.
   * Triggers loading of more events when user scrolls to bottom.
   * 
   * @param event - The scroll event object
   * @returns Promise that resolves when additional events are loaded
   */
  async onFutureEventsScroll(event: any) {
    const element = event.target;
    const atBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 1;
    if (atBottom && !this.futureEventsLoading && !this.noMoreFutureEvents) {
      await this.loadFutureEvents();
    }
  }

  /**
   * Handles scroll events for past events infinite loading.
   * Triggers loading of more events when user scrolls to bottom.
   * 
   * @param event - The scroll event object
   * @returns Promise that resolves when additional events are loaded
   */
  async onPastEventsScroll(event: any) {
    const element = event.target;
    const atBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 1;
    if (atBottom && !this.pastEventsLoading && !this.noMorePastEvents) {
      await this.loadPastEvents();
    }
  }

  /**
   * Handles scroll events for ongoing events infinite loading.
   * Triggers loading of more events when user scrolls to bottom.
   * 
   * @param event - The scroll event object
   * @returns Promise that resolves when additional events are loaded
   */
  async onOnGoingEventsScroll(event: any) {
    const element = event.target;
    const atBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 1;
    if (atBottom && !this.onGoingEventsLoading && !this.noMoreOnGoingEvents) {
      await this.loadOnGoingEvents();
    }
  }

  /**
   * Loads future events from the API with pagination support.
   * Appends new events to existing list and updates pagination state.
   * 
   * @returns Promise that resolves when events are loaded
   * @throws Error if API request fails
   * 
   * @example
   * ```typescript
   * await this.loadFutureEvents();
   * console.log(this.futureEvents); // Updated array with new events
   * ```
   */
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

  /**
   * Loads past events from the API with pagination support.
   * Appends new events to existing list and updates pagination state.
   * 
   * @returns Promise that resolves when events are loaded
   * @throws Error if API request fails
   */
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

  /**
   * Loads ongoing events from the API with pagination support.
   * Appends new events to existing list and updates pagination state.
   * 
   * @returns Promise that resolves when events are loaded
   * @throws Error if API request fails
   */
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
