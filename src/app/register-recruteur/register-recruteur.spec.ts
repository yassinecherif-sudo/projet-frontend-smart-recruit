import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RegisterRecruteur } from './register-recruteur';

describe('RegisterRecruteur', () => {
  let component: RegisterRecruteur;
  let fixture: ComponentFixture<RegisterRecruteur>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegisterRecruteur]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RegisterRecruteur);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
