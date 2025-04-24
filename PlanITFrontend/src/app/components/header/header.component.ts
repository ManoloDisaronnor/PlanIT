import { Component, EventEmitter, HostListener, Output } from '@angular/core';
import { getCurrentUser, logOut, setSessionStorage } from '../../../../config/authUser';
import { apiUrl } from '../../../../config/config';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-header',
  imports: [MatIconModule, CommonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent {
  @Output() toggleLateralMenu: EventEmitter<boolean> = new EventEmitter<boolean>();
  navBarExpanded: boolean = false;
  userImageUrl: string | null = null;
  userName: string | null = null;
  displayName: string | null = null;
  name: string | null = null;
  surname: string | null = null;
  apiUrl: string = apiUrl;
  isMobileView: boolean = false;
  userMenuOpen: boolean = false;

  async ngOnInit() {

    this.checkScreenSize();

    const user = sessionStorage.getItem('user');
    if (user) {
      const userData = JSON.parse(user);
      this.userName = userData.username;
      this.userImageUrl = userData.imageUrl;
      this.name = userData.name;
      this.surname = userData.surname;
      this.displayName = userData.name + ' ' + userData.surname;
    } else {
      const firebaseUser = await getCurrentUser();
      if (firebaseUser) {
        await setSessionStorage(firebaseUser.uid);
        const user = sessionStorage.getItem('user');
        const userData = JSON.parse(user!!);
        this.userName = userData.username;
        this.userImageUrl = userData.imageUrl;
        this.name = userData.name;
        this.surname = userData.surname;
        this.displayName = userData.name + ' ' + userData.surname;
      }
    }
  }

  toggleNavBar() {
    localStorage.setItem('menuState', String(!this.navBarExpanded));
    this.navBarExpanded = !this.navBarExpanded;
    this.toggleLateralMenu.emit(this.navBarExpanded);
  }

  toggleUserMenu(event: Event) {
    event.stopPropagation();
    this.userMenuOpen = !this.userMenuOpen;
  }

  @HostListener('document:click')
  closeUserMenu() {
    if (this.userMenuOpen) {
      this.userMenuOpen = false;
    }
  }

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.checkScreenSize();
    this.updateDisplayName();
  }

  checkScreenSize() {
    this.isMobileView = window.innerWidth < 768;
  }

  updateDisplayName() {
    if (!this.name) return;

    if (this.isMobileView) {
      this.displayName = this.name
    } else {
      this.displayName = this.name + ' ' + this.surname;
    }
  }

  async logout(event: Event) {
    event.stopPropagation();
    await logOut();
    window.location.href = '/auth/login';
  }
}
