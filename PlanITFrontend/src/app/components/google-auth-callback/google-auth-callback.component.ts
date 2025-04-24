import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { getAuth, signInWithCredential, GoogleAuthProvider } from 'firebase/auth';
import { LoadingService } from '../../../../services/loading.service';
import { logOut, setSessionStorage } from '../../../../config/authUser';
import { LoadinganimationComponent } from "../loadinganimation/loadinganimation.component";

@Component({
  selector: 'app-google-auth-callback',
  template: '<div class="fondo"><app-loadinganimation [type]="`fullscreen`"></app-loadinganimation></div>',
  styles: ['.fondo { background-color: #0e0e1b; height: 100%; width: 100%; }'],
  imports: [LoadinganimationComponent],
  standalone: true
})
export class GoogleAuthCallbackComponent {
  loadingService = inject(LoadingService);
  constructor(private route: ActivatedRoute) { }

  async ngOnInit() {
    this.loadingService.showLoading();
    this.route.queryParams.subscribe(async params => {
      const token = params['token'];

      if (token) {
        try {
          const auth = getAuth();
          const credential = GoogleAuthProvider.credential(token);
          await signInWithCredential(auth, credential);
          const uid = auth.currentUser?.uid;
          if (uid) {
            await setSessionStorage(uid);
            window.location.href = '/home';
          } else {
            await logOut();
            window.location.href = '/auth/login?error=Error al iniciar sesión';
          }
        } catch (error: any) {
          await logOut();
          window.location.href = '/auth/login?error=Error al iniciar sesión';
        }
      } else {
        await logOut();
        window.location.href = '/auth/login?error=Error al iniciar sesión';
      }
    });
  }

}