import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OwnedEventsComponent } from './owned-events.component';

describe('OwnedEventsComponent', () => {
  let component: OwnedEventsComponent;
  let fixture: ComponentFixture<OwnedEventsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OwnedEventsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OwnedEventsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
