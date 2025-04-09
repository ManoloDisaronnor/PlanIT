import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthStatusService } from '../../../services/auth.status.service';
import { LoadingService } from '../../../services/loading.service';

export const configurationGuard: CanActivateFn = async () => {
  const router = inject(Router);
  const authService = inject(AuthStatusService);
  const loadingService = inject(LoadingService);
  
  loadingService.showLoading();
  try {
    const status = await authService.getAuthStatus();

    if (!status.firebaseAuthenticated) {
      router.navigate(['/auth/login']);
      return false;
    }

    if (status.userConfigured) {
      router.navigate(['/home']);
      return false;
    }

    return true;
  } finally {
    loadingService.hideLoading();
  }
};