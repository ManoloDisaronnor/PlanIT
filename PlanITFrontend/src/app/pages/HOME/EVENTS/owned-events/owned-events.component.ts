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

/**
 * Component for displaying events created by the authenticated user.
 * 
 * Features include:
 * - Infinite scroll loading of owned events
 * - Event date formatting with status indicators
 * - Real-time date display with countdown functionality
 * - Error handling and user feedback
 * - Integration with scroll service for pagination
 * 
 * @class OwnedEventsComponent
 * @since 1.0.0
 * @author Manuel Santos Márquez
 * 
 * @example
 * ```typescript
 * // Used in template to display user's created events
 * <app-owned-events></app-owned-events>
 * ```
 */
@Component({
  selector: 'app-owned-events',
  imports: [UsereventsinfoComponent, CommonModule, InfodialogComponent, LoadinganimationComponent, RouterLink],
  templateUrl: './owned-events.component.html',
  styleUrl: './owned-events.component.css'
})
export class OwnedEventsComponent {  /** Base API URL for making HTTP requests */
  apiUrl = apiUrl;
  
  /** Current authenticated user's unique identifier */
  userUid!: string;
  
  /** Current user's display name */
  username!: string;
  
  /** Current user's profile image URL */
  userImageUrl!: string;

  /** Pagination offset for events loading */
  eventsOffset = 0;
  
  /** Number of events to load per request */
  eventsLimit = 5;
  
  /** Array of owned events data */
  events: any[] = [];
  
  /** Loading state for events */
  eventsLoading = false;
  
  /** Loading state when fetching more events via infinite scroll */
  eventsLoadingMore = false;
  
  /** Whether all events have been loaded */
  noMoreEvents = false;
  
  /** Current error message to display to user */
  generalError: string | null = null;

  /** Subscription to scroll service for infinite scroll functionality */
  private scrollSubscription?: Subscription;

  /**
   * Creates an instance of OwnedEventsComponent.
   * 
   * @param scrollService - Service for managing scroll state and bottom detection
   */
  constructor(private scrollService: ScrollService) {}
  /**
   * Component initialization lifecycle hook.
   * Retrieves user information and loads created events.
   * Sets up scroll subscription for infinite loading.
   * 
   * @returns Promise that resolves when initialization is complete
   */
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

  /**
   * Retrieves the current user's information from session storage or Firebase authentication.
   * Falls back to Firebase auth if session storage is empty.
   * 
   * @returns Promise that resolves when user information is set
   * @throws Error if user is not authenticated or data cannot be retrieved
   * 
   * @example
   * ```typescript
   * await this.getUserId();
   * console.log(this.userUid); // User's unique identifier
   * console.log(this.username); // User's display name
   * ```
   */
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

  /**
   * Loads events created by the authenticated user from the API.
   * Implements pagination and appends new events to existing list.
   * 
   * @returns Promise that resolves when events are loaded
   * @throws Error if API request fails
   * 
   * @example
   * ```typescript
   * await this.getCreatedEvents();
   * console.log(this.events); // Array of created events
   * ```
   */
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
  /**
   * Handles reaching bottom of scroll container.
   * Triggers loading of more events if not already loading.
   * Called by scroll service subscription.
   */
  onReachedBottom() {
    if (this.eventsLoading || this.noMoreEvents || this.eventsLoadingMore) return;

    this.eventsLoadingMore = true;
    this.getCreatedEvents().finally(() => {
      this.eventsLoadingMore = false;
    });
  }

  /**
   * Displays error messages to the user for 5 seconds.
   * Automatically clears the error after the timeout.
   * 
   * @param message - The error message to display
   * 
   * @example
   * ```typescript
   * this.showFetchError('Failed to load events');
   * // Error will be visible for 5 seconds
   * ```
   */
  showFetchError(message: string) {
    this.generalError = message;
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
}
