import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Auth } from '../Services/auth';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule,
    MatIconModule,
  ],
  templateUrl: './auth.html',
  styleUrls: ['./auth.scss'],
})
export class AuthComponent implements OnInit {

  // ✅ Tab system
  activeTab: 'login' | 'register' = 'login';

  loading = false;
  errorMessage = '';
  emailFocused = false;
  passFocused = false;
  hidePass = true;

  // Forgot password
  showForgot = false;
  resetStep = 1;
  resetEmail = '';
  otpCode = '';
  newPassword = '';
  resetMessage = '';
  resetOk = false;
  otpValidationLoading = false;

  // Modal choix rôle
  showRoleModal = false;

  loginForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private authService: Auth,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      email:    ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });
    
    // ✅ Check query params to set initial tab
    this.route.queryParams.subscribe(params => {
      if (params['tab'] === 'register') {
        this.activeTab = 'register';
      } else {
        this.activeTab = 'login';
      }
    });
  }

  // ===== LOGIN =====
  onLogin(): void {
    if (this.loading) return;
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      this.errorMessage = 'Veuillez remplir correctement les champs.';
      return;
    }
    this.loading = true;
    this.errorMessage = '';

    const loginData = {
      username: this.loginForm.value.email,
      password: this.loginForm.value.password
    };

    this.authService.login(loginData).subscribe({
      next: (response) => {
        this.loading = false;
        this.redirectByRole(response.utilisateur.role);
      },
      error: (error) => {
        this.loading = false;
        if (error.status === 401 || error.status === 403) {
          this.errorMessage = 'Email ou mot de passe incorrect.';
        } else if (error.status === 0) {
          this.errorMessage = 'Impossible de joindre le serveur.';
        } else {
          this.errorMessage = error?.error?.message || 'Erreur lors de la connexion.';
        }
      }
    });
  }

  private redirectByRole(role: string): void {
    switch (role) {
      case 'CANDIDAT':  this.router.navigate(['/candidat-dashboard']); break;
      case 'RECRUTEUR': this.router.navigate(['/recruteur-dashboard']); break;
      case 'ADMIN':     this.router.navigate(['/admin-dashboard']); break;
      default:          this.router.navigate(['/']);
    }
  }

  // ===== MODAL CHOIX ROLE =====
  ouvrirChoixRole(): void {
    this.showRoleModal = true;
  }

  choisirRole(role: 'CANDIDAT' | 'RECRUTEUR'): void {
    this.showRoleModal = false;
    if (role === 'CANDIDAT') {
      this.router.navigate(['/register-candidat']);
    } else {
      this.router.navigate(['/register-recruteur']);
    }
  }

  fermerModal(): void {
    this.showRoleModal = false;
  }

  // ===== NAVIGATION =====
  goHome(): void { this.router.navigate(['/']); }

  // ===== OTP =====
  onOtpInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '');
    input.value = digits.slice(-1);
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += (document.getElementById('otp-' + i) as HTMLInputElement)?.value || '';
    }
    this.otpCode = code;
    if (input.value && index < 5) {
      (document.getElementById('otp-' + (index + 1)) as HTMLInputElement)?.focus();
    }

    if (this.otpCode.length === 6) {
      this.validateOtp();
    }
  }

  onOtpPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pasted = (event.clipboardData?.getData('text') || '').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    for (let i = 0; i < 6; i++) {
      const el = document.getElementById('otp-' + i) as HTMLInputElement | null;
      if (el) el.value = pasted[i] || '';
    }

    this.otpCode = pasted;

    const nextFocusIndex = Math.min(pasted.length, 5);
    (document.getElementById('otp-' + nextFocusIndex) as HTMLInputElement | null)?.focus();

    if (this.otpCode.length === 6) {
      this.validateOtp();
    }
  }

  onOtpKey(event: KeyboardEvent, index: number): void {
    if (event.key === 'Backspace' && !(event.target as HTMLInputElement).value && index > 0) {
      (document.getElementById('otp-' + (index - 1)) as HTMLInputElement)?.focus();
    }
  }

  // ===== RESET PASSWORD =====
  sendResetCode(): void {
    const email = this.resetEmail.trim();
    if (!email) {
      this.resetOk = false;
      this.resetMessage = 'Veuillez saisir votre email.';
      return;
    }

    this.resetEmail = email;
    this.authService.sendResetCode(email).subscribe({
      next: () => {
        this.resetStep = 2;
        this.resetOk = true;
        this.resetMessage = 'Code envoyé à ' + this.resetEmail;
      },
      error: () => {
        this.resetOk = false;
        this.resetMessage = 'Email introuvable dans notre système.';
      }
    });
  }

  validateOtp(): void {
    if (this.otpCode.length < 6 || this.otpValidationLoading) return;
    this.otpValidationLoading = true;

    this.authService.validateCode(this.resetEmail, this.otpCode).subscribe({
      next: (res: any) => {
        const message = typeof res === 'string' ? res : (res?.message || '');
        if (/correct|valide|valid/i.test(message)) {
          this.resetStep = 3;
          this.resetMessage = '';
          this.resetOk = true;
        } else {
          this.resetOk = false;
          this.resetMessage = message || 'Code incorrect.';
        }
        this.otpValidationLoading = false;
      },
      error: () => {
        this.otpValidationLoading = false;
        this.resetOk = false;
        this.resetMessage = 'Code invalide ou expiré.';
      }
    });
  }

  changePassword(): void {
    this.authService.changePassword(this.resetEmail, this.newPassword).subscribe({
      next: () => {
        this.resetOk = true;
        this.resetMessage = 'Mot de passe modifié avec succès !';
        setTimeout(() => { this.showForgot = false; this.resetStep = 1; this.resetMessage = ''; }, 2000);
      },
      error: () => { this.resetOk = false; this.resetMessage = 'Erreur lors du changement.'; }
    });
  }
}