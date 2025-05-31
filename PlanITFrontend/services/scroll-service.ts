import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ScrollService {
  private atBottomSubject = new BehaviorSubject<boolean>(false);
  public atBottom$ = this.atBottomSubject.asObservable();

  updateAtBottom(atBottom: boolean) {
    this.atBottomSubject.next(atBottom);
  }

  getCurrentAtBottomState(): boolean {
    return this.atBottomSubject.value;
  }
}