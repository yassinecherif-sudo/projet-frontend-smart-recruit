import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

const API = 'http://localhost:8083';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    MatIconModule, MatButtonModule,
  ],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.scss',
})
export class AdminDashboard implements OnInit {

  activeSection = 'dashboard';
  currentUser: any = null;

  // Utilisateurs
  utilisateurs: any[] = [];
  filteredUtilisateurs: any[] = [];
  searchUser = '';

  // Tags
  tags: any[] = [];
  filteredTags: any[] = [];
  searchTag = '';
  showTagModal = false;
  editTagMode = false;
  selectedTag: any = null;
  tagForm!: FormGroup;

  // Statistiques
  stats = {
    totalUtilisateurs: 0,
    totalCandidats: 0,
    totalRecruteurs: 0,
    totalTags: 0,
    totalOffres: 0,
    totalCandidatures: 0,
  };

  categories = ['Backend', 'Frontend', 'DevOps', 'Data', 'Mobile', 'Design', 'Soft Skills', 'Autre'];

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {
    const stored = this.getStorageItem('utilisateur');
    this.currentUser = stored
      ? JSON.parse(stored)
      : { id: 1, prenom: 'Demo', nom: 'Admin', role: 'ADMIN' };

    this.initTagForm();
    this.loadUtilisateurs();
    this.loadTags();
    this.loadOffres();
  }

  // ===== FORM =====
  initTagForm(): void {
    this.tagForm = this.fb.group({
      libelle:   ['', Validators.required],
      categorie: ['Backend', Validators.required],
    });
  }

  // ===== UTILISATEURS =====
  loadUtilisateurs(): void {
    this.http.get<any[]>(`${API}/users`).subscribe({
      next: (data) => {
        this.utilisateurs = data;
        this.filteredUtilisateurs = data;
        this.stats.totalUtilisateurs = data.length;
        this.stats.totalCandidats = data.filter(u => u.role === 'CANDIDAT').length;
        this.stats.totalRecruteurs = data.filter(u => u.role === 'RECRUTEUR').length;
      },
      error: () => {}
    });
  }

  filterUtilisateurs(): void {
    const q = this.searchUser.toLowerCase();
    this.filteredUtilisateurs = this.utilisateurs.filter(u =>
      u.nom?.toLowerCase().includes(q) ||
      u.prenom?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q)
    );
  }

  activerCompte(id: number): void {
    this.http.put(`${API}/users/${id}/activer`, {}).subscribe({
      next: () => this.loadUtilisateurs()
    });
  }

  supprimerUtilisateur(id: number): void {
    if (!confirm('Supprimer cet utilisateur ?')) return;
    this.http.delete(`${API}/users/${id}`).subscribe({
      next: () => this.loadUtilisateurs()
    });
  }

  // ===== TAGS =====
  loadTags(): void {
    this.http.get<any[]>(`${API}/tags`).subscribe({
      next: (data) => {
        this.tags = data;
        this.filteredTags = data;
        this.stats.totalTags = data.length;
      }
    });
  }

  filterTags(): void {
    const q = this.searchTag.toLowerCase();
    this.filteredTags = this.tags.filter(t =>
      t.libelle?.toLowerCase().includes(q) ||
      t.categorie?.toLowerCase().includes(q)
    );
  }

  ouvrirCreerTag(): void {
    this.editTagMode = false;
    this.selectedTag = null;
    this.initTagForm();
    this.showTagModal = true;
  }

  ouvrirModifierTag(tag: any): void {
    this.editTagMode = true;
    this.selectedTag = tag;
    this.tagForm.patchValue({
      libelle: tag.libelle,
      categorie: tag.categorie,
    });
    this.showTagModal = true;
  }

  soumettreTag(): void {
    if (this.tagForm.invalid) return;
    const payload = this.tagForm.value;

    if (this.editTagMode && this.selectedTag) {
      this.http.put(`${API}/tags/${this.selectedTag.id}`, payload).subscribe({
        next: () => { this.showTagModal = false; this.loadTags(); }
      });
    } else {
      this.http.post(`${API}/tags`, payload).subscribe({
        next: () => { this.showTagModal = false; this.loadTags(); }
      });
    }
  }

  supprimerTag(id: number): void {
    if (!confirm('Supprimer ce tag ?')) return;
    this.http.delete(`${API}/tags/${id}`).subscribe({
      next: () => this.loadTags()
    });
  }

  // ===== OFFRES =====
  loadOffres(): void {
    this.http.get<any[]>(`${API}/offres`).subscribe({
      next: (data) => {
        this.stats.totalOffres = data.length;
      }
    });
  }

  // ===== HELPERS =====
  getInitials(): string {
    if (!this.currentUser) return '?';
    return `${(this.currentUser.prenom || '?')[0]}${(this.currentUser.nom || '?')[0]}`.toUpperCase();
  }

  getRoleClass(role: string): string {
    const map: any = {
      'ADMIN': 'role-admin',
      'CANDIDAT': 'role-candidat',
      'RECRUTEUR': 'role-recruteur',
    };
    return map[role] || '';
  }

  getCategorieColor(categorie: string): string {
    const map: any = {
      'Backend':     '#6366f1',
      'Frontend':    '#ec4899',
      'DevOps':      '#f59e0b',
      'Data':        '#3b82f6',
      'Mobile':      '#8b5cf6',
      'Design':      '#10b981',
      'Soft Skills': '#94a3b8',
      'Autre':       '#64748b',
    };
    return map[categorie] || '#6366f1';
  }

  getTagsByCategorie(categorie: string): any[] {
    return this.filteredTags.filter(tag => tag.categorie === categorie);
  }

  logout(): void {
    this.removeStorageItem('token');
    this.removeStorageItem('utilisateur');
    this.router.navigate(['/auth']);
  }

  private getStorageItem(key: string): string | null {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(key);
  }

  private removeStorageItem(key: string): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(key);
  }
}