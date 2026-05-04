import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';

const API = 'http://localhost:8083';

@Component({
  selector: 'app-register-candidat',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatIconModule,
  ],
  templateUrl: './register-candidat.html',
  styleUrl: './register-candidat.scss',
})
export class RegisterCandidat implements OnInit {
  loading = false;
  errorMessage = '';
  successMessage = '';
  hideRegPass = true;
  private readonly passwordPattern = /^(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;

  registerForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.registerForm = this.fb.group({
      prenom: ['', Validators.required],
      nom: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.pattern(this.passwordPattern)]],
      posteRecherche: [''],
      localisation: [''],
      experienceAnnees: [null],
      telephone: [''],
    });
  }

  // ---- Password strength ----
get pwStrength(): number {
  const pw = this.registerForm.get('password')?.value || '';
  if (!pw.length) return 0;

  const hasMinLength  = pw.length >= 8;
  const hasUpperCase  = /[A-Z]/.test(pw);
  const hasSpecial    = /[!@#$%^&*(),.?":{}|<>]/.test(pw);

  if (hasMinLength && hasUpperCase && hasSpecial) return 4; // Excellent
  if (hasMinLength && hasUpperCase) return 3;               // Fort
  if (hasMinLength) return 2;                               // Moyen
  return 1;                                                 // Faible
}

get pwStrengthLabel(): string {
  return ['', 'Faible', 'Moyen', 'Fort', 'Excellent'][this.pwStrength] || '';
}

get passwordMissingConditions(): string[] {
  const pw = this.registerForm.get('password')?.value || '';
  const missing: string[] = [];

  if (pw.length < 8) {
    missing.push('Min. 8 caracteres');
  }
  if (!/[A-Z]/.test(pw)) {
    missing.push('Une lettre majuscule');
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(pw)) {
    missing.push('Un caractere special (ex: !@#$%)');
  }

  return missing;
}

get showPasswordConditionError(): boolean {
  const pw = this.registerForm.get('password')?.value || '';
  return pw.length > 0 && this.passwordMissingConditions.length > 0;
}
  // ---- Register (Candidat) ----
  onRegister(): void {
    if (this.loading) return;
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      this.errorMessage = 'Veuillez respecter les conditions du formulaire.';
      return;
    }
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const v = this.registerForm.value;

    const payload = {
      nom: v.nom,
      prenom: v.prenom,
      email: v.email,
      motDePasse: v.password,
      role: 'CANDIDAT',
      telephone: v.telephone,
      localisation: v.localisation,
      posteRecherche: v.posteRecherche,
      experienceAnnees: v.experienceAnnees,
    };

    this.http.post(`${API}/candidats`, payload).subscribe({
      next: () => {
        this.loading = false;
        this.successMessage = '✅ Compte créé avec succès ! Redirection...';
        this.registerForm.reset();
        setTimeout(() => {
          this.router.navigate(['/auth']);
        }, 2000);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err?.error?.message || 'Erreur lors de la création du compte.';
      }
    });
  }

  goHome(): void {
    this.router.navigate(['/']);
  }

  goToLogin(): void {
    this.router.navigate(['/auth']);
  }
  goToRegisterRecruteur(): void {
  this.router.navigate(['/register-recruteur']);
}
}
