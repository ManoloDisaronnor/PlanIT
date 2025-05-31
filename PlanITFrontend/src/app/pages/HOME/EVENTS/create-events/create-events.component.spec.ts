import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateEventsComponent } from './create-events.component';

describe('CreateEventsComponent', () => {
  let component: CreateEventsComponent;
  let fixture: ComponentFixture<CreateEventsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateEventsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreateEventsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
