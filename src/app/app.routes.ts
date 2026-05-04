import { Routes } from '@angular/router';
import { Home } from './Pages/home/home';
import { AuthComponent } from './auth/auth';
import { RegisterCandidat } from './register-candidat/register-candidat';
import { CandidatDashboardComponent } from './candidat-dashboard/candidat-dashboard';
import { AdminDashboard } from './admin-dashboard/admin-dashboard';
import { RucrutteurDashboard } from './rucrutteur-dashboard/rucrutteur-dashboard';
import { authGuard } from './guards/auth-guard';
import { roleGuard } from './guards/role-guard';
import { RegisterRecruteur } from './register-recruteur/register-recruteur';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },

  // Pages publiques — pas besoin de token
  { path: 'home',               component: Home },
  { path: 'auth',               component: AuthComponent },
  { path: 'register-candidat',  component: RegisterCandidat },
  { path: 'register-recruteur', component: RegisterRecruteur },
  // Pages protégées — besoin d'être connecté + bon rôle
  {
    path: 'candidat-dashboard',
    component: CandidatDashboardComponent,
    canActivate: [authGuard, roleGuard(['CANDIDAT'])]
  },
  {
    path: 'recruteur-dashboard',
    component: RucrutteurDashboard,
    canActivate: [authGuard, roleGuard(['RECRUTEUR'])]
  },
  {
    path: 'admin-dashboard',
    component: AdminDashboard,
    canActivate: [authGuard, roleGuard(['ADMIN'])]
  },

  // Route 404 → redirect home
  { path: '**', redirectTo: 'home' }
];