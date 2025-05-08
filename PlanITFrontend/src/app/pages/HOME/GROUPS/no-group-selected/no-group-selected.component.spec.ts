import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NoGroupSelectedComponent } from './no-group-selected.component';

describe('NoGroupSelectedComponent', () => {
  let component: NoGroupSelectedComponent;
  let fixture: ComponentFixture<NoGroupSelectedComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NoGroupSelectedComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NoGroupSelectedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
