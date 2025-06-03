import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, throwError, of } from 'rxjs';
import { catchError, tap, switchMap, filter, retry, delay } from 'rxjs/operators';

/**
 * Servicio para integración con Google Maps API
 * Proporciona funcionalidades para lugares, geocodificación y geolocalización
 * Maneja la carga asíncrona de librerías y la obtención de ubicación del usuario
 * 
 * @class GoogleMapsService
 * @since 1.0.0
 * @author Manuel Santos Márquez
 */
@Injectable({
    providedIn: 'root'
})
export class GoogleMapsService {    /** Librería de Places de Google Maps cargada */
    private placesLibrary: any = null;
    /** BehaviorSubject para la librería de Places */
    private placesLibrarySubject = new BehaviorSubject<any>(null);
    /** BehaviorSubject para la ubicación del usuario */
    private userLocationSubject = new BehaviorSubject<google.maps.LatLngLiteral | null>(null);
    /** Flag para evitar múltiples cargas simultáneas */
    private isLoadingPlaces = false;

    constructor() {
        this.initPlacesLibrary();
        this.getUserLocation().subscribe();
    }

    /**
     * Inicializa la librería de Places de Google Maps de forma asíncrona
     * Implementa reintentos automáticos en caso de fallo
     * 
     * @private
     */

    private async initPlacesLibrary() {
        if (this.isLoadingPlaces) return;

        this.isLoadingPlaces = true;
        try {
            if (!window.google || !window.google.maps) {
                await new Promise<void>(resolve => {
                    let attempts = 0;
                    const maxAttempts = 20;

                    const checkGoogleMaps = setInterval(() => {
                        attempts++;
                        if (window.google && window.google.maps) {
                            clearInterval(checkGoogleMaps);
                            resolve();
                        } else if (attempts >= maxAttempts) {
                            clearInterval(checkGoogleMaps);
                            throw new Error('Google Maps API no se cargó después de varios intentos');
                        }
                    }, 250);
                });
            }

            this.placesLibrary = await google.maps.importLibrary('places');

            if (!this.placesLibrary) {
                throw new Error('Places library no se pudo cargar correctamente');
            }
            this.placesLibrarySubject.next(this.placesLibrary);
        } catch (error) {
            console.error('Error loading Places library:', error);
            this.placesLibrarySubject.error(error);
            setTimeout(() => {
                this.isLoadingPlaces = false;
                this.initPlacesLibrary();
            }, 2000);
        } finally {
            this.isLoadingPlaces = false;
        }
    }

    getPlacesLibrary(): Observable<any> {
        if (this.placesLibrary) {
            return of(this.placesLibrary);
        }

        return this.placesLibrarySubject.asObservable().pipe(
            filter(library => !!library),
            retry(3),
            tap(lib => {
                if (!lib) console.error('Places library es null después de obtenerla');
            })
        );
    }

    getUserLocation(): Observable<google.maps.LatLngLiteral | null> {
        if (!navigator.geolocation) {
            return throwError(() => new Error('Geolocalización no soportada por este navegador'));
        }

        return new Observable<google.maps.LatLngLiteral>(observer => {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const location = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    this.userLocationSubject.next(location);
                    observer.next(location);
                    observer.complete();
                },
                (error) => {
                    console.error('Error getting user location:', error);
                    observer.error(error);
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        }).pipe(
            catchError(error => {
                console.error('Error in geolocation observable:', error);
                return throwError(() => error);
            })
        );
    }

    get userLocation(): Observable<google.maps.LatLngLiteral | null> {
        return this.userLocationSubject.asObservable();
    }

    createAutocomplete(inputElement: HTMLInputElement, options?: any): Observable<any> {
        if (!inputElement) {
            return throwError(() => new Error('El elemento input es null'));
        }

        return this.getPlacesLibrary().pipe(
            switchMap(placesLib => {
                if (!placesLib || !placesLib.Autocomplete) {
                    return of(null).pipe(
                        delay(500),
                        switchMap(() => this.createAutocomplete(inputElement, options))
                    );
                }

                try {
                    const autocompleteOptions = options || {
                        fields: ['geometry', 'name', 'formatted_address'],
                        types: ['geocode', 'establishment']
                    };

                    const autocomplete = new placesLib.Autocomplete(inputElement, autocompleteOptions);
                    return of(autocomplete);
                } catch (error) {
                    console.error('Error creating autocomplete:', error);
                    return throwError(() => error);
                }
            }),
            filter(result => result !== null)
        );
    }
}