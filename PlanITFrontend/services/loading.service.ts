import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class LoadingService {
    private loading = false;

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

    hideLoading() {
        this.loading = false;
        const loadingElement = document.getElementById('app-loading');
        if (loadingElement) {
            loadingElement.style.display = 'none';
            document.body.style.overflow = '';
        }
    }

    isLoading(): boolean {
        return this.loading;
    }
}