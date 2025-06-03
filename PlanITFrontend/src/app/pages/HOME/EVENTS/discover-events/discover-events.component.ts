import {
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild,
  AfterViewInit,
} from '@angular/core';
import { GoogleMapsService } from '../../../../../../services/google-maps-service';
import { GoogleMapsModule } from '@angular/google-maps';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription, timer, of } from 'rxjs';
import { switchMap, tap, retry, catchError, distinctUntilChanged } from 'rxjs/operators';
import { EventFilterService } from '../../../../../../services/events-filter-service';
import { LoadinganimationComponent } from '../../../../components/loadinganimation/loadinganimation.component';
import { apiUrl } from '../../../../../../config/config';
import { InfodialogComponent } from '../../../../components/infodialog/infodialog.component';
import { ScrollService } from '../../../../../../services/scroll-service';
import { RouterLink } from '@angular/router';

/**
 * Componente para descubrir eventos públicos en el mapa
 * Permite buscar eventos por ubicación, aplicar filtros y visualizar en Google Maps
 * Incluye funcionalidades de geolocalización y autocompletado de lugares
 * 
 * @class DiscoverEventsComponent
 * @implements {OnInit, AfterViewInit, OnDestroy}
 * @since 1.0.0
 * @author Manuel Santos Márquez
 */
@Component({
  selector: 'app-discover-events',
  imports: [
    GoogleMapsModule,
    CommonModule,
    FormsModule,
    LoadinganimationComponent,
    InfodialogComponent,
    RouterLink
  ],
  templateUrl: './discover-events.component.html',
  styleUrl: './discover-events.component.css',
})
export class DiscoverEventsComponent
  implements OnInit, AfterViewInit, OnDestroy
{  /** Referencia al input de búsqueda para autocompletado */
  @ViewChild('searchInput') searchInput!: ElementRef;
  /** URL base de la API */
  apiUrl = apiUrl;

  /** Latitud del usuario actual */
  userLat: number | null = null;
  /** Longitud del usuario actual */
  userLng: number | null = null;
  /** Latitud de la búsqueda activa */
  searchLat: number | null = null;
  /** Longitud de la búsqueda activa */
  searchLng: number | null = null;

  /** Ubicación de búsqueda actual */
  currentSeachLocation: string | null = null;

  /** Estado de carga de ubicación */
  isLoadingLocation = false;
  /** Error de geolocalización */
  locationError: string | null = null;
  /** Estado de inicialización del autocompletado */
  autocompleteInitialized = false;

  events: any[] = [];
  eventsLoading = false;
  eventsLoadingMore = false;
  noMoreEvents = false;
  eventsOffset = 0;
  eventsLimit = 10;

  currentFilters: any[] | null = null;

  generalMessage: string | null = null;
  messageType: 'info' | 'error' = 'error';

  private autocomplete: any;
  private subscriptions: Subscription[] = [];
  private scrollSubscription?: Subscription;
  private filtersSubscription?: Subscription;

  constructor(
    private mapsService: GoogleMapsService,
    private filtersService: EventFilterService,
    private ngZone: NgZone,
    private scrollService: ScrollService
  ) {
    this.injectAutocompleteStyles();
  }

  ngOnInit() {
    this.connectUserUbication();
    this.scrollSubscription = this.scrollService.atBottom$.subscribe(atBottom => {
      if (atBottom) {
        this.onReachedBottom();
      }
    });
    this.filtersSubscription = this.filtersService.selectedFilters$
      .pipe(
        distinctUntilChanged((prev, curr) => {
          return JSON.stringify(prev) === JSON.stringify(curr);
        })
      )
      .subscribe(filters => {
        console.log('Filtros actualizados:', filters);
        this.currentFilters = filters;
        
        this.eventsOffset = 0;
        this.events = [];
        this.noMoreEvents = false;
        this.buscarEventos(true);
      });
  }

  ngAfterViewInit() {
    if (this.searchInput) {
      const initSub = timer(500)
        .pipe(
          switchMap(() => {
            if (this.searchInput && this.searchInput.nativeElement) {
              return this.initAutocomplete();
            }
            return of(null);
          })
        )
        .subscribe();
      this.subscriptions.push(initSub);
    }
  }

  ngOnDestroy() {
    if (this.subscriptions.length > 0) {
      this.subscriptions.forEach((subscription) => subscription.unsubscribe());
    }
    if (this.scrollSubscription) {
      this.scrollSubscription.unsubscribe();
    }
    if (this.filtersSubscription) {
      this.filtersSubscription.unsubscribe();
    }
    this.filtersService.removeAllFilters();
  }

  removeUbicationFilter() {
    this.userLat = null;
    this.userLng = null;
    this.searchLat = null;
    this.searchLng = null;
    if (this.searchInput && this.searchInput.nativeElement) {
      this.searchInput.nativeElement.value = '';
    }
    this.eventsOffset = 0;
    this.events = [];
    this.noMoreEvents = false;
    this.buscarEventos(true);
  }

  connectUserUbication() {
    this.isLoadingLocation = true;
    const userUbi = this.mapsService
      .getUserLocation()
      .pipe(
        catchError((error) => {
          this.locationError = 'No se pudo acceder a tu ubicación.';
          console.error('Error al obtener ubicación:', error);
          return of(null);
        })
      )
      .subscribe({
        next: (location) => {
          this.isLoadingLocation = false;
          if (location) {
            this.userLat = location.lat;
            this.userLng = location.lng;
            this.eventsOffset = 0;
            this.events = [];
            this.noMoreEvents = false;
            this.buscarEventos(true);
          } else {
            this.locationError = 'No se pudo acceder a tu ubicación.';
            console.error('Ubicación no disponible');
            this.eventsOffset = 0;
            this.events = [];
            this.noMoreEvents = false;
            this.buscarEventos(true);
          }
        },
        error: (error) => {
          this.isLoadingLocation = false;
          this.locationError = 'No se pudo acceder a tu ubicación.';
          console.error('Error al obtener ubicación:', error);
          this.eventsOffset = 0;
          this.events = [];
          this.noMoreEvents = false;
          this.buscarEventos(true);
        },
      });
    this.subscriptions.push(userUbi);
  }

  initAutocomplete() {
    if (this.autocompleteInitialized) return of(null);

    return this.mapsService
      .createAutocomplete(this.searchInput.nativeElement, {
        fields: ['geometry', 'name', 'formatted_address'],
        types: ['geocode', 'establishment'],
      })
      .pipe(
        tap(() => (this.autocompleteInitialized = true)),
        retry({
          count: 3,
          delay: () => timer(1000),
        }),
        tap(
          (autocomplete) => {
            this.autocomplete = autocomplete;
            this.autocomplete.addListener('place_changed', () => {
              this.ngZone.run(() => {
                const place = this.autocomplete.getPlace();
                if (!place.geometry || !place.geometry.location) {
                  console.error(
                    'No se encontraron detalles para el lugar seleccionado'
                  );
                  return;
                }

                const lat = place.geometry.location.lat();
                const lng = place.geometry.location.lng();

                if (lat && lng) {
                  this.searchLat = lat;
                  this.searchLng = lng;
                  this.userLat = null;
                  this.userLng = null;
                }

                this.eventsOffset = 0;
                this.events = [];
                this.noMoreEvents = false;
                this.buscarEventos(true);
              });
            });
          },
          (error) => console.error('Error al crear el autocomplete:', error)
        )
      );
  }

  goToMyLocation(event: any) {
    event.preventDefault();
    event.stopPropagation();

    this.isLoadingLocation = true;
    this.locationError = null;

    this.mapsService.getUserLocation().subscribe({
      next: (location) => {
        this.isLoadingLocation = false;
        if (location) {
          this.userLat = location.lat;
          this.userLng = location.lng;
          this.searchLat = null;
          this.searchLng = null;

          this.eventsOffset = 0;
          this.events = [];
          this.noMoreEvents = false;
          this.buscarEventos(true);
        }
      },
      error: (error) => {
        this.isLoadingLocation = false;
        this.locationError = 'No se pudo acceder a tu ubicación.';
        console.error('Error al obtener ubicación:', error);
        this.eventsOffset = 0;
        this.events = [];
        this.noMoreEvents = false;
        this.buscarEventos(true);
      },
    });
  }

  async buscarEventos(reset: boolean = false) {
    if (this.searchInput.nativeElement.value) {
      this.currentSeachLocation = this.searchInput.nativeElement.value;
    }
    this.eventsLoading = true;
    try {
      const params = new URLSearchParams({
        limit: this.eventsLimit.toString(),
        offset: this.eventsOffset.toString()
      });
      
      if (this.userLat !== null) params.append('userLat', this.userLat.toString());
      if (this.userLng !== null) params.append('userLng', this.userLng.toString());
      if (this.searchLat !== null) params.append('searchLat', this.searchLat.toString());
      if (this.searchLng !== null) params.append('searchLng', this.searchLng.toString());
      
      if (this.currentFilters && this.currentFilters.length > 0) {
        params.append('filters', JSON.stringify(this.currentFilters));
      }
      const response = await fetch(`${apiUrl}api/events/discover?${params.toString()}`,{
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();
      if (response.ok) {
        const newEvents = data.datos;

        if (reset) {
          this.events = newEvents;
          this.eventsOffset = newEvents.length;
        } else {
          this.events = [...this.events, ...newEvents];
          this.eventsOffset += newEvents.length;
        }

        if (newEvents.length < this.eventsLimit) {
          this.noMoreEvents = true;
        }
      } else {
        this.showInformation(data.mensaje, 'error');
      }

    } catch (error: any) {
      this.showInformation(
        'Error al obtener los eventos: ' + error.message,
        'error'
      );
    }
    this.eventsLoading = false;
  }

  onReachedBottom() {
    if (this.eventsLoading || this.noMoreEvents || this.eventsLoadingMore) return;

    this.eventsLoadingMore = true;
    this.buscarEventos().finally(() => {
      this.eventsLoadingMore = false;
    });
  }

  showInformation(message: string, type: 'info' | 'error') {
    this.generalMessage = message;
    this.messageType = type;
    setTimeout(() => {
      this.generalMessage = null;
    }, 5000);
  }

  injectAutocompleteStyles() {
    const styleId = 'google-places-autocomplete-styles-discover';

    if (document.getElementById(styleId)) {
      return;
    }

    const styleElement = document.createElement('style');
    styleElement.id = styleId;
    styleElement.innerHTML = `
      .pac-container {
        background-color: #121222;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.5);
        font-family: inherit;
        border-radius: 4px;
        padding: 5px 0;
        margin-top: 5px;
      }
      .pac-item {
        padding: 8px 12px;
        color: white;
        cursor: pointer;
        border-top: 1px solid #2d2d3d;
        font-size: 14px;
      }
      .pac-item:hover, .pac-item-selected {
        background-color: #7c7cff3d;
      }
      .pac-item-query {
        color: #a05cff;
        font-size: 15px;
        padding-right: 5px;
      }
      .pac-matched {
        color: #7c7cff;
        font-weight: bold;
      }
      .pac-icon {
        filter: brightness(1.5) hue-rotate(180deg);
      }
      .pac-item-description {
        color: #9ca5b3;
      }
    `;
    document.head.appendChild(styleElement);
  }

  formatDates(
    startDateString: string,
    endDateString: string
  ): { startDate: string; endDate: string | null } {
    const eventStartDate = new Date(startDateString);
    const eventEndDate = new Date(endDateString);
    const now = new Date();
    const startTimeDiff = eventStartDate.getTime() - now.getTime();
    const endTimeDiff = eventEndDate.getTime() - now.getTime();

    if (endTimeDiff < 0) {
      return {
        startDate: 'Finalizado',
        endDate: null,
      };
    }

    if (startTimeDiff < 0 && endTimeDiff > 0) {
      return {
        startDate: 'En curso',
        endDate: this.formatSingleDate(endDateString),
      };
    }

    return {
      startDate: this.formatSingleDate(startDateString),
      endDate: this.formatSingleDate(endDateString),
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

      return `Quedan ${hours.toString().padStart(2, '0')}:${minutes
        .toString()
        .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    if (window.innerWidth < 768) {
      const day = eventDate.getDate().toString().padStart(2, '0');
      const month = (eventDate.getMonth() + 1).toString().padStart(2, '0');
      const year = eventDate.getFullYear().toString().slice(-2);

      return `${day}/${month}/${year}`;
    }

    const daysOfWeek = [
      'Domingo',
      'Lunes',
      'Martes',
      'Miércoles',
      'Jueves',
      'Viernes',
      'Sábado',
    ];
    const months = [
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre',
    ];

    const dayName = daysOfWeek[eventDate.getDay()];
    const day = eventDate.getDate();
    const month = months[eventDate.getMonth()];
    const year = eventDate.getFullYear();
    const hours = eventDate.getHours().toString().padStart(2, '0');
    const minutes = eventDate.getMinutes().toString().padStart(2, '0');

    return `${dayName}, ${day}, ${month}, ${year} - ${hours}:${minutes}`;
  }
}
