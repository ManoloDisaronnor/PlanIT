import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FeaturecommingsoonComponent } from './featurecommingsoon.component';

describe('FeaturecommingsoonComponent', () => {
  let component: FeaturecommingsoonComponent;
  let fixture: ComponentFixture<FeaturecommingsoonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FeaturecommingsoonComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FeaturecommingsoonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
