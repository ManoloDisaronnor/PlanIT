import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BackGroundAuthComponent } from './backgroundauth.component';

describe('BackGroundAuth', () => {
  let component: BackGroundAuthComponent;
  let fixture: ComponentFixture<BackGroundAuthComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BackGroundAuthComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BackGroundAuthComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
