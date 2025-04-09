import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StepspersonalinformationComponent } from './stepspersonalinformation.component';

describe('StepspersonalinformationComponent', () => {
  let component: StepspersonalinformationComponent;
  let fixture: ComponentFixture<StepspersonalinformationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StepspersonalinformationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StepspersonalinformationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
