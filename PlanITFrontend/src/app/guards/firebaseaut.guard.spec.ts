import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { firebaseautGuard } from './firebaseaut.guard';

describe('firebaseautGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => firebaseautGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
