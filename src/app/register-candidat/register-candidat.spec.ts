import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RegisterCandidat } from './register-candidat';

describe('RegisterCandidat', () => {
  let component: RegisterCandidat;
  let fixture: ComponentFixture<RegisterCandidat>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegisterCandidat]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RegisterCandidat);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
