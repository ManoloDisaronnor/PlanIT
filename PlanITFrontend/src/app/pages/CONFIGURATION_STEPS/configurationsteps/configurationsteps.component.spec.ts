import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfigurationstepsComponent } from './configurationsteps.component';

describe('ConfigurationstepsComponent', () => {
  let component: ConfigurationstepsComponent;
  let fixture: ComponentFixture<ConfigurationstepsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfigurationstepsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConfigurationstepsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
