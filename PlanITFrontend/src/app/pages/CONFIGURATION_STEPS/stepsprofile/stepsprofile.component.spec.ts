import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StepsprofileComponent } from './stepsprofile.component';

describe('StepsprofileComponent', () => {
  let component: StepsprofileComponent;
  let fixture: ComponentFixture<StepsprofileComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StepsprofileComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StepsprofileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
