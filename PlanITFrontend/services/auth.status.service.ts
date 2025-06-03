import { Injectable } from '@angular/core';
import { apiUrl } from '../config/config';

/**
 * Interface que define el estado de autenticación del usuario
 * @interface AuthStatus
 */
export interface AuthStatus {
    /** Indica si el usuario está autenticado con Firebase */
    firebaseAuthenticated: boolean;
    /** Indica si el usuario ha completado su configuración de perfil */
    userConfigured: boolean;
    /** Datos del usuario autenticado */
    userData: any;
}

/**
 * Servicio para gestionar el estado de autenticación del usuario
 * Proporciona funcionalidades para verificar el estado de autenticación
 * con sistema de caché para optimizar las consultas al backend
 * 
 * @class AuthStatusService
 * @since 1.0.0
 * @author Manuel Santos Márquez
 */
@Injectable({
    providedIn: 'root'
})
export class AuthStatusService {    /** Estado de autenticación cacheado para evitar consultas innecesarias */
    private cachedStatus: AuthStatus = {
        firebaseAuthenticated: false,
        userConfigured: false,
        userData: null
    };
    /** Timestamp de la última verificación de estado */
    private lastCheck: number = 0;
    /** Tiempo de validez del caché en milisegundos (30 segundos) */
    private cacheValidTime = 30000; // 30 segundos de caché

    /**
     * Obtiene el estado de autenticación del usuario
     * Utiliza un sistema de caché para optimizar las consultas al backend
     * 
     * @param {boolean} forceRefresh - Fuerza la actualización ignorando el caché
     * @returns {Promise<AuthStatus>} Promise que resuelve con el estado de autenticación
     * @throws {Error} Error si falla la comunicación con el backend
     * 
     * @example
     * ```typescript
     * // Obtener estado con caché
     * const status = await authService.getAuthStatus();
     * 
     * // Forzar actualización
     * const freshStatus = await authService.getAuthStatus(true);
     * ```
     */

    async getAuthStatus(forceRefresh = false): Promise<AuthStatus> {
        const now = Date.now();

        // Si hay datos en caché válidos y no se fuerza la actualización
        if (this.cachedStatus && (now - this.lastCheck < this.cacheValidTime) && !forceRefresh) {
            return this.cachedStatus;
        }

        try {
            const response = await fetch(`${apiUrl}auth/checkauthstatus`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.cachedStatus = data.datos;
                this.lastCheck = now;
                return this.cachedStatus;
            } else {
                const errorData = await response.json();
                this.cachedStatus = {
                    firebaseAuthenticated: false,
                    userConfigured: false,
                    userData: null
                };
                this.lastCheck = now;
                console.error('Error auth status:', errorData);
                return this.cachedStatus;
            }
        } catch (error) {
            console.error('Error fetching auth status:', error);
            this.cachedStatus = {
                firebaseAuthenticated: false,
                userConfigured: false,
                userData: null
            };
            this.lastCheck = now;
            return this.cachedStatus;
        }
    }
}