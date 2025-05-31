import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class EventFilterService {
  private selectedFiltersSubject = new BehaviorSubject<any[] | null>(null);
  public selectedFilters$ = this.selectedFiltersSubject.asObservable();

  onFilterUpdate(newFilter: any) {
    if (!newFilter) return;

    let currentFilters = this.selectedFiltersSubject.value || [];
    const index = currentFilters.findIndex(
      (filter) => filter.filter === newFilter.filter
    );

    if (index === -1) {
      currentFilters = [...currentFilters, newFilter];
    } else {
      currentFilters = currentFilters.filter(
        (filter) => filter.filter !== newFilter.filter
      );
    }

    this.selectedFiltersSubject.next(
      currentFilters.length > 0 ? currentFilters : null
    );
  }

  removeAllFilters() {
    this.selectedFiltersSubject.next(null);
  }

  getAllSelectedFilters(): any[] | null {
    return this.selectedFiltersSubject.value;
  }
}
