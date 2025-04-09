import { ApplicationConfig, importProvidersFrom, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { CircleX, Info, LucideAngularModule, Eye, EyeOff, ChevronLeft, ChevronRight, Venus, Mars, Transgender, Pencil, X, ImageUp, Camera, ImageOff } from 'lucide-angular';
import { provideLottieOptions } from 'ngx-lottie';
import player from 'lottie-web';

import { routes } from './app.routes';
import { provideHttpClient } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }), provideRouter(routes),
    provideRouter(routes, withComponentInputBinding()),
    importProvidersFrom(LucideAngularModule.pick({ Info, CircleX, Eye, EyeOff, ChevronLeft, ChevronRight, Venus, Mars, Transgender, Pencil, X, ImageUp, Camera, ImageOff })),
    provideLottieOptions({
      player: () => player
    }),
    provideHttpClient()
  ]
};
