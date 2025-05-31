import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UsereventsinfoComponent } from './usereventsinfo.component';

describe('UsereventsinfoComponent', () => {
  let component: UsereventsinfoComponent;
  let fixture: ComponentFixture<UsereventsinfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UsereventsinfoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UsereventsinfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
