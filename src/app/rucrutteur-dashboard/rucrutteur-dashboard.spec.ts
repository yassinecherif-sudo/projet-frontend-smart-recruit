import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RucrutteurDashboard } from './rucrutteur-dashboard';

describe('RucrutteurDashboard', () => {
  let component: RucrutteurDashboard;
  let fixture: ComponentFixture<RucrutteurDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RucrutteurDashboard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RucrutteurDashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
