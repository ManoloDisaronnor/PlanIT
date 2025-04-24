import { Injectable } from '@angular/core';
import { apiUrl } from '../config/config';

export interface AuthStatus {
    firebaseAuthenticated: boolean;
    userConfigured: boolean;
    userData: any;
}

@Injectable({
    providedIn: 'root'
})
export class AuthStatusService {
    private cachedStatus: AuthStatus = {
        firebaseAuthenticated: false,
        userConfigured: false,
        userData: null
    };
    private lastCheck: number = 0;
    private cacheValidTime = 30000; // 30 segundos de caché

    async getAuthStatus(forceRefresh = false): Promise<AuthStatus> {
        const now = Date.now();

        // Si hay datos en caché válidos y no se fuerza la actualización
        if (this.cachedStatus && (now - this.lastCheck < this.cacheValidTime) && !forceRefresh) {
            return this.cachedStatus;
        }

        try {
            const response = await fetch(`${apiUrl}api/auth/checkauthstatus`, {
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