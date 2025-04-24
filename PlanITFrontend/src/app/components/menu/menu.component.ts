import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { getCurrentUser, setSessionStorage } from '../../../../config/authUser';
import { apiUrl } from '../../../../config/config';

@Component({
  selector: 'app-menu',
  imports: [CommonModule, RouterModule],
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.css'
})
export class MenuComponent {
  @Input() menuExpanded: boolean;
  imageUrl: string | null = null;
  apiUrl: string = apiUrl;

  constructor() {
    const menuState = localStorage.getItem('menuState');
    if (menuState) {
      this.menuExpanded = menuState === 'true';
    } else {
      localStorage.setItem('menuState', 'false');
      this.menuExpanded = false;
    }
  }

  async ngOnInit() {
    const user = sessionStorage.getItem('user');
    if (user) {
      const userData = JSON.parse(user);
      this.imageUrl = userData.imageUrl;
    } else {
      const firebaseUser = await getCurrentUser();
      if (firebaseUser) {
        await setSessionStorage(firebaseUser.uid);
        const user = sessionStorage.getItem('user');
        const userData = JSON.parse(user!!);
        this.imageUrl = userData.imageUrl;
      }
    }
  }
}
