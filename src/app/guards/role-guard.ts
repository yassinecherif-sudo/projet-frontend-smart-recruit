import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../Services/auth';

export const roleGuard = (allowedRoles: string[]): CanActivateFn => {
  return (route, state) => {
    const authService = inject(Auth);
    const router = inject(Router);

    const utilisateur = authService.getUtilisateur();

    if (!utilisateur) {
      return true;
    }

    if (allowedRoles.includes(utilisateur.role)) {
      return true;
    }

    // Redirige vers son dashboard si mauvais rôle
    switch (utilisateur.role) {
      case 'CANDIDAT':
        router.navigate(['/candidat-dashboard']);
        break;
      case 'RECRUTEUR':
        router.navigate(['/recruteur-dashboard']);
        break;
      case 'ADMIN':
        router.navigate(['/admin-dashboard']);
        break;
      default:
        router.navigate(['/auth']);
    }

    return false;
  };
};