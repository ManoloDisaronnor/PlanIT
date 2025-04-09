import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StepsallsetComponent } from './stepsallset.component';

describe('StepsallsetComponent', () => {
  let component: StepsallsetComponent;
  let fixture: ComponentFixture<StepsallsetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StepsallsetComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StepsallsetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
