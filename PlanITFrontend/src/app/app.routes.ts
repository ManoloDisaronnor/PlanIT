import { Routes } from '@angular/router';
import { BackGroundAuthComponent } from './pages/AUTH/backgroundauth/backgroundauth.component';
import { LoginComponent } from './pages/AUTH/login/login.component';
import { SignupComponent } from './pages/AUTH/signup/signup.component';
import { ConfigurationstepsComponent } from './pages/CONFIGURATION_STEPS/configurationsteps/configurationsteps.component';
import { HomeComponent } from './pages/HOME/home/home.component';
import { noAuthGuard } from './guards/noauth.guard';
import { configurationGuard } from './guards/firebaseaut.guard';
import { homeGuard } from './guards/auth.guard';
import { NotfoundComponent } from './components/notfound/notfound.component';
import { GoogleAuthCallbackComponent } from './components/google-auth-callback/google-auth-callback.component';


export const routes: Routes = [
    {
        path: 'auth',
        component: BackGroundAuthComponent,
        canActivate: [noAuthGuard],
        children: [
            { path: 'login', component: LoginComponent },
            { path: 'signup', component: SignupComponent },
            { path: '', redirectTo: 'login', pathMatch: 'full' }
        ]
    },
    {
        path: 'google-auth-callback',
        component: GoogleAuthCallbackComponent,
    },
    {
        path: 'configuration-steps',
        component: ConfigurationstepsComponent,
        canActivate: [configurationGuard]
    },
    {
        path: 'home',
        component: HomeComponent,
        canActivate: [homeGuard]
    },
    { path: '', redirectTo: '/home', pathMatch: 'full' },
    { path: '**', component: NotfoundComponent }
];
