import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

/**
 * Servicio para gestionar filtros de eventos en tiempo real
 * Permite agregar, remover y consultar filtros aplicados a la búsqueda de eventos
 * 
 * @class EventFilterService
 * @since 1.0.0
 * @author Manuel Santos Márquez
 */
@Injectable({
  providedIn: 'root',
})
export class EventFilterService {
  /** BehaviorSubject que mantiene el estado actual de los filtros seleccionados */
  private selectedFiltersSubject = new BehaviorSubject<any[] | null>(null);
  /** Observable público para que los componentes se suscriban a cambios de filtros */
  public selectedFilters$ = this.selectedFiltersSubject.asObservable();

  /**
   * Actualiza los filtros seleccionados, agregando o removiendo según corresponda
   * Si el filtro ya existe, lo elimina; si no existe, lo agrega
   * 
   * @param {any} newFilter - Nuevo filtro a aplicar o remover
   * 
   * @example
   * ```typescript
   * const filter = { filter: 'category', value: 'music' };
   * eventFilterService.onFilterUpdate(filter);
   * ```
   */
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
  /**
   * Elimina todos los filtros aplicados
   * Útil para resetear el estado de filtrado
   * 
   * @example
   * ```typescript
   * eventFilterService.removeAllFilters();
   * ```
   */
  removeAllFilters() {
    this.selectedFiltersSubject.next(null);
  }

  /**
   * Obtiene todos los filtros actualmente seleccionados
   * 
   * @returns {any[] | null} Array de filtros seleccionados o null si no hay filtros
   * 
   * @example
   * ```typescript
   * const activeFilters = eventFilterService.getAllSelectedFilters();
   * if (activeFilters) {
   *   console.log('Filtros activos:', activeFilters);
   * }
   * ```
   */
  getAllSelectedFilters(): any[] | null {
    return this.selectedFiltersSubject.value;
  }
}
