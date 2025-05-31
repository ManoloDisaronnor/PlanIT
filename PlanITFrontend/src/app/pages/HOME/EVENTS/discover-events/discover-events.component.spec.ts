import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DiscoverEventsComponent } from './discover-events.component';

describe('DiscoverEventsComponent', () => {
  let component: DiscoverEventsComponent;
  let fixture: ComponentFixture<DiscoverEventsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DiscoverEventsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DiscoverEventsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
