import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StepsverificationComponent } from './stepsverification.component';

describe('StepsverificationComponent', () => {
  let component: StepsverificationComponent;
  let fixture: ComponentFixture<StepsverificationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StepsverificationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StepsverificationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
