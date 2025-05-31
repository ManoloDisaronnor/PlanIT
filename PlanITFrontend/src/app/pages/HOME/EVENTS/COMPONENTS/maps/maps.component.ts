import { Component, ElementRef, EventEmitter, Input, NgZone, OnDestroy, OnInit, Output, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GoogleMap, GoogleMapsModule } from '@angular/google-maps';
import { FormsModule } from '@angular/forms';
import { catchError, interval, of, Subscription, timer } from 'rxjs';
import { switchMap, tap, retry, takeWhile } from 'rxjs/operators';
import { mapId } from '../../../../../../../config/config';
import { GoogleMapsService } from '../../../../../../../services/google-maps-service';
import { LoadinganimationComponent } from "../../../../../components/loadinganimation/loadinganimation.component";

@Component({
  selector: 'app-maps',
  standalone: true,
  imports: [GoogleMapsModule, CommonModule, FormsModule, LoadinganimationComponent],
  templateUrl: './maps.component.html',
  styleUrl: './maps.component.css'
})
export class MapsComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('searchInput') searchInput!: ElementRef;
  @ViewChild('googleMap') googleMap!: GoogleMap;

  @Input() readOnly: boolean = false;
  @Input() initialLocation: google.maps.LatLngLiteral | null = null;
  @Input() initialZoom: number = 12;
  @Input() height: string = '400px';
  @Input() width: string = '100%';
  @Input() showCurrentLocation: boolean = true;

  @Output() locationSelected = new EventEmitter<google.maps.LatLngLiteral>();

  center: google.maps.LatLngLiteral = { lat: 37.2862, lng: -5.9239 };
  zoom = 12;
  markerOptions: google.maps.marker.AdvancedMarkerElementOptions = {};
  markerPosition: google.maps.LatLngLiteral | null = null;
  eventLocation: google.maps.LatLngLiteral | null = null;

  userCurrentLocation: google.maps.LatLngLiteral | null = null;
  userLocationCircleOptions: google.maps.CircleOptions = {
    fillColor: '#4285F4',
    fillOpacity: 0.35,
    strokeColor: '#0066ff',
    strokeOpacity: 0.8,
    strokeWeight: 2,
    clickable: false,
    draggable: false,
    editable: false,
    visible: true,
    radius: 50,
    zIndex: 1
  };

  userLocationMarkerOptions: google.maps.MarkerOptions = {
    icon: {
      path: google.maps.SymbolPath.CIRCLE,
      fillColor: '#4285F4',
      fillOpacity: 1,
      strokeColor: '#FFFFFF',
      strokeWeight: 2,
      scale: 8,
    },
    clickable: false,
    draggable: false,
    visible: true,
    zIndex: 2,
    title: 'Tu ubicación actual'
  };

  userLocationActive: boolean = false;

  darkMapStyle = [
    { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#a05cff" }] },
    {
      featureType: "administrative.locality",
      elementType: "labels.text.fill",
      stylers: [{ color: "#7c7cff" }],
    },
    {
      featureType: "poi",
      elementType: "labels.text.fill",
      stylers: [{ color: "#d59563" }],
    },
    {
      featureType: "poi.park",
      elementType: "geometry",
      stylers: [{ color: "#263c3f" }],
    },
    {
      featureType: "poi.park",
      elementType: "labels.text.fill",
      stylers: [{ color: "#6b9a76" }],
    },
    {
      featureType: "road",
      elementType: "geometry",
      stylers: [{ color: "#38414e" }],
    },
    {
      featureType: "road",
      elementType: "geometry.stroke",
      stylers: [{ color: "#212a37" }],
    },
    {
      featureType: "road",
      elementType: "labels.text.fill",
      stylers: [{ color: "#9ca5b3" }],
    },
    {
      featureType: "road.highway",
      elementType: "geometry",
      stylers: [{ color: "#808097" }],
    },
    {
      featureType: "road.highway",
      elementType: "geometry.stroke",
      stylers: [{ color: "#1f2835" }],
    },
    {
      featureType: "road.highway",
      elementType: "labels.text.fill",
      stylers: [{ color: "#f3d19c" }],
    },
    {
      featureType: "transit",
      elementType: "geometry",
      stylers: [{ color: "#2f3948" }],
    },
    {
      featureType: "transit.station",
      elementType: "labels.text.fill",
      stylers: [{ color: "#d59563" }],
    },
    {
      featureType: "water",
      elementType: "geometry",
      stylers: [{ color: "#17263c" }],
    },
    {
      featureType: "water",
      elementType: "labels.text.fill",
      stylers: [{ color: "#515c6d" }],
    },
    {
      featureType: "water",
      elementType: "labels.text.stroke",
      stylers: [{ color: "#17263c" }],
    },
  ];

  mapOptions: google.maps.MapOptions = {
    mapId: mapId
  };

  private styledMapType: google.maps.StyledMapType | null = null;
  private autocomplete: any;
  isLoadingLocation = false;
  locationError: string | null = null;
  private subscriptions: Subscription[] = [];
  autocompleteInitialized = false;
  private locationTrackingActive = false;

  constructor(
    private ngZone: NgZone,
    private mapsService: GoogleMapsService
  ) {
    this.injectAutocompleteStyles()
  }

  ngOnInit() {
    if (this.initialZoom) {
      this.zoom = this.initialZoom;
    }

    if (this.initialLocation) {
      this.center = this.initialLocation;
      this.eventLocation = this.initialLocation;
      this.markerPosition = this.initialLocation;
      if (!this.readOnly) {
        this.locationSelected.emit(this.initialLocation);
      }
    } else if (!this.readOnly) {
      this.isLoadingLocation = true;

      const locationSub = this.mapsService.getUserLocation().pipe(
        catchError(error => {
          this.locationError = 'No se pudo acceder a tu ubicación. Usando ubicación predeterminada.';
          console.error('Error de geolocalización:', error);
          return of(null);
        })
      ).subscribe(location => {
        this.isLoadingLocation = false;
        if (location) {
          this.center = location;
          this.markerPosition = location;
          this.locationSelected.emit(location);
        }
      });
      this.subscriptions.push(locationSub);
    }

    if (this.showCurrentLocation) {
      this.startLocationTracking();
    }
    
  }

  ngAfterViewInit() {
    this.applyDarkStyle();
    if (!this.readOnly && this.searchInput) {
      const initSub = timer(500).pipe(
        switchMap(() => {
          if (this.searchInput && this.searchInput.nativeElement) {
            return this.initAutocomplete();
          }
          return of(null);
        })
      ).subscribe();
      this.subscriptions.push(initSub);
    }
  }

  applyDarkStyle() {
    if (this.googleMap && this.googleMap.googleMap) {
      const map = this.googleMap.googleMap;
      this.styledMapType = new google.maps.StyledMapType(
        this.darkMapStyle,
        { name: 'Mapa Oscuro' }
      );
      map.mapTypes.set('styled_map', this.styledMapType);
      map.setMapTypeId('styled_map');
    } else {
      setTimeout(() => this.applyDarkStyle(), 1000);
    }
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.locationTrackingActive = false;
  }

  injectAutocompleteStyles() {
    const styleId = 'google-places-autocomplete-styles';
    
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

  startLocationTracking() {
    if (!navigator.geolocation) {
      console.warn('Geolocalización no disponible en este navegador');
      return;
    }
    this.locationTrackingActive = true;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.ngZone.run(() => {
          this.userCurrentLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          this.userLocationActive = true;
          this.updateCircleRadius();
        });
      },
      (error) => {
        console.warn('Error obteniendo la ubicación actual:', error);
      },
      { enableHighAccuracy: true }
    );

    const watchSub = interval(10000)
      .pipe(
        takeWhile(() => this.locationTrackingActive)
      )
      .subscribe(() => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            this.ngZone.run(() => {
              this.userCurrentLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
              };
              this.userLocationActive = true;
              this.updateCircleRadius();
            });
          },
          (error) => {
            console.warn('Error actualizando la ubicación actual:', error);
          },
          { enableHighAccuracy: true }
        );
      });

    this.subscriptions.push(watchSub);
  }

  updateCircleRadius() {
    const maxScale = 12;

    let radius: number;
    let iconScale: number;

    if (this.zoom >= 18) {
      radius = 30;
      iconScale = 8;
    } else if (this.zoom >= 15) {
      radius = 50;
      iconScale = 10;
    } else if (this.zoom >= 12) {
      radius = 100;
      iconScale = 12;
    } else if (this.zoom >= 10) {
      radius = 200;
      iconScale = 12;
    } else if (this.zoom >= 8) {
      radius = 300;
      iconScale = 12;
    } else {
      radius = 350;
      iconScale = maxScale;
    }

    this.userLocationCircleOptions = {
      ...this.userLocationCircleOptions,
      radius: Math.min(radius, 400),
      strokeWeight: this.zoom <= 8 ? 3 : 2,
      zIndex: this.zoom <= 8 ? 3 : 1,
    };
    const icon = {
      ...this.userLocationMarkerOptions.icon as google.maps.Symbol,
      scale: iconScale,
      strokeWeight: this.zoom <= 8 ? 3 : 2
    };

    this.userLocationMarkerOptions = {
      ...this.userLocationMarkerOptions,
      icon: icon
    };
  }

  onZoomChanged() {
    if (this.googleMap && this.googleMap.googleMap) {
      this.zoom = this.googleMap.googleMap.getZoom() || this.zoom;
      this.updateCircleRadius();
    }
  }

  initAutocomplete() {
    if (this.autocompleteInitialized || this.readOnly) return of(null);

    return this.mapsService.createAutocomplete(this.searchInput.nativeElement).pipe(
      tap(() => this.autocompleteInitialized = true),
      retry({
        count: 3,
        delay: () => {
          return timer(1000);
        }
      }),
      tap(
        autocomplete => {
          this.autocomplete = autocomplete;
          this.autocomplete.addListener('place_changed', () => {
            this.ngZone.run(() => {
              const place = this.autocomplete.getPlace();
              if (!place.geometry || !place.geometry.location) {
                console.error('No se encontraron detalles para el lugar seleccionado');
                return;
              }
              const location = {
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng()
              };
              this.center = location;
              this.markerPosition = location;
              this.zoom = 15;
              this.locationSelected.emit(location);
              if (place.geometry.viewport && this.googleMap.googleMap) {
                this.googleMap.googleMap.fitBounds(place.geometry.viewport);
              }
            });
          });
        },
        error => console.error('Error final al crear el autocomplete:', error)
      )
    );
  }

  moveMap(event: google.maps.MapMouseEvent) {
    if (event.latLng) {
      this.center = event.latLng.toJSON();
    }
  }

  addMarker(event: google.maps.MapMouseEvent) {
    if (this.readOnly) return;

    if (event.latLng) {
      this.markerPosition = event.latLng.toJSON();
      this.locationSelected.emit(this.markerPosition);
    }
  }

  goToMyLocation(event: any) {
    event.preventDefault();
    event.stopPropagation();
    this.isLoadingLocation = true;
    this.mapsService.getUserLocation().subscribe({
      next: location => {
        this.isLoadingLocation = false;
        if (location) {
          this.center = location;
          if (!this.readOnly) {
            this.markerPosition = location;
            this.locationSelected.emit(location);
          }
          this.zoom = 15;
        }
      },
      error: error => {
        this.isLoadingLocation = false;
        this.locationError = 'No se pudo acceder a tu ubicación.';
        console.error('Error al obtener ubicación:', error);
      }
    });
  }

  goToEventLocation() {
    if (this.eventLocation) {
      this.center = this.eventLocation;
      this.zoom = 15;
    }
  }
  
  toggleCurrentLocationVisibility() {
    if (this.showCurrentLocation) {
      if (!this.userLocationActive) {
        this.startLocationTracking();
      }
    }
  }
}