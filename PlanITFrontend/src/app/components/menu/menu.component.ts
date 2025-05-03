import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
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
  @Input() menuExpanded: boolean = false;
  @Output() toggleMenu: EventEmitter<boolean> = new EventEmitter<boolean>();
  imageUrl: string | null = null;
  apiUrl: string = apiUrl;

  toggleNavBar() {
    this.menuExpanded = !this.menuExpanded;
    this.toggleMenu.emit(this.menuExpanded);
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
