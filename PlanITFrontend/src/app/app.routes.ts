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
import { EventsComponent } from './pages/HOME/EVENTS/events/events.component';
import { GroupsComponent } from './pages/HOME/GROUPS/groups/groups.component';
import { SettingsComponent } from './pages/HOME/SETTINGS/settings/settings.component';
import { ProfileComponent } from './pages/HOME/PROFILE/profile/profile.component';
import { NoGroupSelectedComponent } from './pages/HOME/GROUPS/no-group-selected/no-group-selected.component';
import { GroupChatComponent } from './pages/HOME/GROUPS/group-chat/group-chat.component';
import { GroupInfoComponent } from './pages/HOME/GROUPS/group-info/group-info.component';


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
        canActivate: [homeGuard],
        children: [
            { path: 'events', component: EventsComponent, canActivate: [homeGuard] },
            { path: 'groups', component: GroupsComponent, canActivate: [homeGuard], children: [
                { path: '', component: NoGroupSelectedComponent, canActivate: [homeGuard] },
                { path: 'chat/:groupId', component: GroupChatComponent, canActivate: [homeGuard] },
                { path: 'info/:groupId', component: GroupInfoComponent, canActivate: [homeGuard] },
            ] },
            { path: 'settings', component: SettingsComponent, canActivate: [homeGuard] },
            { path: 'profile', component: ProfileComponent, canActivate: [homeGuard] }
        ]
    },
    { path: '', redirectTo: '/home', pathMatch: 'full' },
    { path: '**', component: NotfoundComponent }
];
