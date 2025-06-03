import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

/**
 * Servicio para gestionar el estado de scroll en la aplicación
 * Permite detectar cuando el usuario ha llegado al final de un contenedor
 * Útil para implementar scroll infinito y lazy loading
 * 
 * @class ScrollService
 * @since 1.0.0
 * @author Manuel Santos Márquez
 */
@Injectable({
  providedIn: 'root'
})
export class ScrollService {
  /** BehaviorSubject que indica si el scroll está en el fondo */
  private atBottomSubject = new BehaviorSubject<boolean>(false);
  /** Observable público para suscribirse a cambios de estado de scroll */
  public atBottom$ = this.atBottomSubject.asObservable();

  /**
   * Actualiza el estado de scroll cuando se detecta el fondo
   * 
   * @param {boolean} atBottom - Indica si el scroll está en el fondo
   * 
   * @example
   * ```typescript
   * onScroll(event: Event) {
   *   const element = event.target as HTMLElement;
   *   const atBottom = element.scrollTop + element.clientHeight >= element.scrollHeight - 5;
   *   scrollService.updateAtBottom(atBottom);
   * }
   * ```
   */
  updateAtBottom(atBottom: boolean) {
    this.atBottomSubject.next(atBottom);
  }

  /**
   * Obtiene el estado actual del scroll sin suscribirse
   * 
   * @returns {boolean} True si el scroll está en el fondo
   * 
   * @example
   * ```typescript
   * if (scrollService.getCurrentAtBottomState()) {
   *   console.log('El usuario está en el fondo de la página');
   * }
   * ```
   */
  getCurrentAtBottomState(): boolean {
    return this.atBottomSubject.value;
  }
}