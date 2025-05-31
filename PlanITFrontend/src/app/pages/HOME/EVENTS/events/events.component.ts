import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  HostListener,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { apiUrl } from '../../../../../../config/config';
import { ReactiveFormsModule } from '@angular/forms';
import {
  getCurrentUser,
  setSessionStorage,
} from '../../../../../../config/authUser';
import { InfodialogComponent } from '../../../../components/infodialog/infodialog.component';
import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { ScrollService } from '../../../../../../services/scroll-service';
import { EventFilterService } from '../../../../../../services/events-filter-service';
import { Subscription } from 'rxjs';

interface Filter {
  type: 'clothing' | 'music' | 'pricing' | 'place';
  filter: string;
  checked?: boolean;
}

@Component({
  selector: 'app-events',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    InfodialogComponent,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
  ],
  templateUrl: './events.component.html',
  styleUrl: './events.component.css',
})
export class EventsComponent implements OnInit, OnDestroy {
  apiUrl = apiUrl;
  userUid!: string;
  userName!: string;
  userSurname!: string;
  userUsername!: string;
  userImageUrl!: string;

  atBottom = false;
  generalError: string | null = null;

  showFilters = false;
  clothingFilterExpanded = false;
  musicFilterExpanded = false;
  pricingFilterExpanded = false;
  placeFilterExpanded = false;
  allFilters: Filter[] = [];

  private subscription = new Subscription();

  constructor(
    private elementRef: ElementRef,
    private scrollService: ScrollService,
    private filtersService: EventFilterService,
    public router: Router
  ) {}

  get selectedFilters(): Filter[] | null {
    return this.filtersService.getAllSelectedFilters();
  }

  @HostListener('document:click', ['$event'])
  clickOutside(event: Event) {
    if (this.showFilters) {
      const filterElement =
        this.elementRef.nativeElement.querySelector('.events-filters');
      const filterToggle =
        this.elementRef.nativeElement.querySelector('.filter-toggle');

      if (
        filterElement &&
        !filterElement.contains(event.target) &&
        filterToggle &&
        !filterToggle.contains(event.target)
      ) {
        this.showFilters = false;
      }
    }
  }

  async ngOnInit() {
    await this.getUserId();
    await this.getAllFilters();

    this.subscription.add(
      this.filtersService.selectedFilters$.subscribe((filters) => {
        this.updateLocalFiltersState(filters);
      })
    );
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  async getUserId(): Promise<void> {
    const user = sessionStorage.getItem('user');
    if (user) {
      const userData = JSON.parse(user);
      this.userUid = userData.uid;
      this.userName = userData.name;
      this.userSurname = userData.surname;
      this.userUsername = userData.username;
      this.userImageUrl = userData.imageUrl;
    } else {
      const firebaseUser = await getCurrentUser();
      if (firebaseUser) {
        await setSessionStorage(firebaseUser.uid);
        const user = sessionStorage.getItem('user');
        if (user) {
          const userData = JSON.parse(user);
          this.userUid = userData.uid;
          this.userName = userData.name;
          this.userSurname = userData.surname;
          this.userUsername = userData.username;
          this.userImageUrl = userData.imageUrl;
        }
      }
    }
  }

  async getAllFilters() {
    try {
      const response = await fetch(`${this.apiUrl}api/events/filters`, {
        method: 'GET',
      });

      const data = await response.json();
      if (response.ok) {
        this.allFilters = data.datos;
        this.updateLocalFiltersState(
          this.filtersService.getAllSelectedFilters()
        );
      } else {
        this.showFetchError('Error al obtener los filtros: ' + data.mensaje);
      }
    } catch (error: any) {
      this.showFetchError('Error al obtener los filtros: ' + error.message);
    }
  }

  private updateLocalFiltersState(selectedFilters: any[] | null) {
    this.allFilters.forEach((filter) => {
      filter.checked = selectedFilters
        ? selectedFilters.some((sf) => sf.filter === filter.filter)
        : false;
    });
  }

  selectFilter(filter: Filter) {
    filter.checked = !filter.checked;
    this.filtersService.onFilterUpdate(filter);
  }

  removeAllFilters(event: any) {
    event.stopPropagation();
    this.filtersService.removeAllFilters();
  }

  showFetchError(message: string) {
    this.generalError = message;
    setTimeout(() => {
      this.generalError = null;
    }, 5000);
  }

  toggleFilters(event: any) {
    event.stopPropagation();
    this.showFilters = !this.showFilters;
  }

  onScroll(event: any) {
    const element = event.target;
    this.atBottom =
      element.scrollHeight - element.scrollTop <= element.clientHeight + 1;
    this.scrollService.updateAtBottom(this.atBottom);
  }
}
