import { Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MenuComponent } from "../../../components/menu/menu.component";
import { HeaderComponent } from "../../../components/header/header.component";
import { Router, RouterOutlet } from '@angular/router';
import { FriendsComponent } from '../COMPONENTS/friends/friends.component';
import { InformationComponent } from '../COMPONENTS/information/information.component';
import { NotificationsComponent } from '../COMPONENTS/notifications/notifications.component';

@Component({
  selector: 'app-home',
  imports: [CommonModule, MenuComponent, HeaderComponent, RouterOutlet, FriendsComponent, InformationComponent, NotificationsComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  menuExpanded: boolean = false;
  @ViewChild('friendsMenu') friendsMenuRef?: ElementRef;
  @ViewChild('informationMenu') informationMenuRef?: ElementRef;
  @ViewChild('notificationsMenu') notificationsMenuRef?: ElementRef;
  friendsMenuExpanded: boolean = false;
  informationMenuExpanded: boolean = false;
  notificationsMenuExpanded: boolean = false;

  constructor(public router: Router) {}

  @HostListener('document:click', ['$event.target'])
  onClick(target: HTMLElement) {
    if (this.friendsMenuExpanded
      && this.friendsMenuRef
      && !this.friendsMenuRef.nativeElement.contains(target)) {
      this.friendsMenuExpanded = false;
    }
    if (this.informationMenuExpanded
      && this.informationMenuRef
      && !this.informationMenuRef.nativeElement.contains(target)) {
      this.informationMenuExpanded = false;
    }
    if (this.notificationsMenuExpanded
      && this.notificationsMenuRef
      && !this.notificationsMenuRef.nativeElement.contains(target)) {
      this.notificationsMenuExpanded = false;
    }
  }

  toogleMenu(event: boolean) {
    this.menuExpanded = event;
  }

  toggleLateralMenu(event: boolean) {
    this.menuExpanded = event;
  }

  toggleFriendsMenu(event: boolean) {
    this.friendsMenuExpanded = event;
    this.informationMenuExpanded = false;
    this.notificationsMenuExpanded = false;
  }

  toggleInformationMenu(event: boolean) {
    this.informationMenuExpanded = event;
    this.friendsMenuExpanded = false;
    this.notificationsMenuExpanded = false;
  }
  toggleNotificationsMenu(event: boolean) {
    this.notificationsMenuExpanded = event;
    this.friendsMenuExpanded = false;
    this.informationMenuExpanded = false;
  }

  closeInformationModal() {
    this.informationMenuExpanded = false;
  }
}
