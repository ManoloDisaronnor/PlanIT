import { environment } from '../src/environments/environment';

export const apiUrl = environment.apiUrl || 'http://localhost:3000/';
export const appTitle = environment.appTitle || 'PlanIT';
export const firebaseConfig = environment.firebaseConfig;