import { Injectable } from '@angular/core';

/**
 * Servicio para gestionar pantallas de carga globales
 * Controla la visualización y ocultación de elementos de carga
 * Maneja el estado de carga y el bloqueo de scroll
 * 
 * @class LoadingService
 * @since 1.0.0
 * @author Manuel Santos Márquez
 */
@Injectable({
    providedIn: 'root'
})
export class LoadingService {
    /** Estado actual de carga */
    private loading = false;

    /**
     * Muestra la pantalla de carga global
     * Posiciona el elemento de carga y bloquea el scroll del body
     */
    showLoading() {
        this.loading = true;
        const loadingElement = document.getElementById('app-loading');
        if (loadingElement) {
            loadingElement.style.display = 'flex';
            loadingElement.style.position = 'fixed';
            loadingElement.style.top = '0';
            loadingElement.style.left = '0';
            loadingElement.style.zIndex = '9999';
            document.body.style.overflow = 'hidden';
        }
    }

    /**
     * Oculta la pantalla de carga global
     * Restaura el scroll normal del body
     */
    hideLoading() {
        this.loading = false;
        const loadingElement = document.getElementById('app-loading');
        if (loadingElement) {
            loadingElement.style.display = 'none';
            document.body.style.overflow = '';
        }
    }

    /**
     * Verifica si la aplicación está en estado de carga
     * 
     * @returns {boolean} Estado actual de carga
     */
    isLoading(): boolean {
        return this.loading;
    }
}