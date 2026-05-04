import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';

const API = 'http://localhost:8083';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    MatIconModule,
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

  // Statistiques avancées
  statsLoading = true;
  advancedStats: any = null;

  stats = {
    totalUtilisateurs: 0,
    totalCandidats: 0,
    totalRecruteurs: 0,
    totalTags: 0,
    totalOffres: 0,
    totalCandidatures: 0,
  };

  readonly defaultCategories = ['Backend', 'Frontend', 'DevOps', 'Mobile', 'Cloud', 'Base de données', 'Langue', 'Outils', 'TECH', 'Autre'];
  readonly customCategoryValue = '__CUSTOM_CATEGORY__';
  newCategoryName = '';

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const stored = this.getStorageItem('utilisateur');
    this.currentUser = stored
      ? JSON.parse(stored)
      : { id: 1, prenom: 'Demo', nom: 'Admin', role: 'ADMIN' };

    this.initTagForm();
    this.loadUtilisateurs();
    this.loadTags();
    this.loadAdvancedStats();
  }

  // ===== FORM =====
  initTagForm(): void {
    this.tagForm = this.fb.group({
      libelle:   ['', Validators.required],
      categorie: [this.defaultCategories[0], Validators.required],
    });
  }

  // ===== STATS AVANCÉES =====
  loadAdvancedStats(): void {
    this.statsLoading = true;
    this.http.get<any>(`${API}/admin/stats`).subscribe({
      next: (data) => {
        this.advancedStats = data;
        this.stats.totalUtilisateurs = data.totalUtilisateurs;
        this.stats.totalCandidats    = data.totalCandidats;
        this.stats.totalRecruteurs   = data.totalRecruteurs;
        this.stats.totalTags         = data.totalTags;
        this.stats.totalOffres       = data.totalOffres;
        this.stats.totalCandidatures = data.totalCandidatures;
        this.statsLoading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.statsLoading = false; this.cdr.detectChanges(); }
    });
  }

  getTagBarWidth(count: number, list: any[]): string {
    if (!list || !list.length) return '0%';
    const max = Math.max(...list.map((t: any) => t.count));
    return max > 0 ? Math.round((count / max) * 100) + '%' : '0%';
  }

  getMoisLabel(moisStr: string): string {
    const mois = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
    const parts = moisStr.split('-');
    return parts.length < 2 ? moisStr : (mois[parseInt(parts[1], 10) - 1] || moisStr);
  }

  getBarHeight(total: number, list: any[]): string {
    if (!list || !list.length) return '4px';
    const max = Math.max(...list.map((m: any) => m.total));
    if (max === 0) return '4px';
    return Math.max(Math.round((total / max) * 120), 4) + 'px';
  }

  getTotalContrats(): number {
    if (!this.advancedStats?.repartitionTypeContrat) return 1;
    return (Object.values(this.advancedStats.repartitionTypeContrat)
      .reduce((a: any, b: any) => a + b, 0) as number) || 1;
  }

  getTotalNiveaux(): number {
    if (!this.advancedStats?.repartitionNiveauExperience) return 1;
    return (Object.values(this.advancedStats.repartitionNiveauExperience)
      .reduce((a: any, b: any) => a + b, 0) as number) || 1;
  }

  objectKeys(obj: any): string[] { return obj ? Object.keys(obj) : []; }

  // ===== UTILISATEURS =====
  loadUtilisateurs(): void {
    this.http.get<any[]>(`${API}/users`).subscribe({
      next: (data) => {
        this.utilisateurs = data;
        this.filteredUtilisateurs = data;
        this.stats.totalUtilisateurs = data.length;
        this.stats.totalCandidats    = data.filter(u => u.role === 'CANDIDAT').length;
        this.stats.totalRecruteurs   = data.filter(u => u.role === 'RECRUTEUR').length;
        this.cdr.detectChanges();
      },
      error: () => { this.cdr.detectChanges(); }
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
    this.cdr.detectChanges();
  }

  activerCompte(id: number): void {
    this.http.put(`${API}/users/${id}/activer`, {}).subscribe({
      next: () => {
        this.loadUtilisateurs();
        this.cdr.detectChanges();
      }
    });
  }

  supprimerUtilisateur(id: number): void {
    if (!confirm('Supprimer cet utilisateur ?')) return;
    this.http.delete(`${API}/users/${id}`).subscribe({
      next: () => {
        this.loadUtilisateurs();
        this.loadAdvancedStats();
        this.cdr.detectChanges();
      }
    });
  }

  // ===== TAGS =====
  loadTags(): void {
    this.http.get<any[]>(`${API}/tags`).subscribe({
      next: (data) => {
        const normalized = data.map((tag) => ({
          ...tag,
          libelle: typeof tag?.libelle === 'string' ? tag.libelle.trim() : tag?.libelle,
          categorie: this.normalizeCategorie(tag?.categorie),
        }));

        this.tags = normalized;
        this.filteredTags = normalized;
        this.stats.totalTags = normalized.length;
        this.cdr.detectChanges();
      }
    });
  }

  filterTags(): void {
    const q = this.searchTag.toLowerCase();
    this.filteredTags = this.tags.filter(t =>
      t.libelle?.toLowerCase().includes(q) ||
      t.categorie?.toLowerCase().includes(q)
    );
    this.cdr.detectChanges();
  }

  ouvrirCreerTag(): void {
    this.editTagMode = false;
    this.selectedTag = null;
    this.newCategoryName = '';
    this.initTagForm();
    this.showTagModal = true;
    this.cdr.detectChanges();
  }

  ouvrirModifierTag(tag: any): void {
    this.editTagMode = true;
    this.selectedTag = tag;
    this.newCategoryName = '';
    this.tagForm.patchValue({ libelle: tag.libelle, categorie: this.normalizeCategorie(tag.categorie) });
    this.showTagModal = true;
    this.cdr.detectChanges();
  }

  soumettreTag(): void {
    if (this.tagForm.invalid) return;
    const categorieFinale = this.getSelectedCategorie();
    if (!categorieFinale) {
      alert('Veuillez saisir une catégorie valide.');
      return;
    }

    const payload = {
      ...this.tagForm.value,
      libelle: this.normalizeCategorie(this.tagForm.value.libelle),
      categorie: categorieFinale,
    };

    if (this.editTagMode && this.selectedTag) {
      this.http.put(`${API}/tags/${this.selectedTag.id}`, payload).subscribe({
        next: () => { this.showTagModal = false; this.loadTags(); this.loadAdvancedStats(); this.cdr.detectChanges(); }
      });
    } else {
      this.http.post(`${API}/tags`, payload).subscribe({
        next: () => { this.showTagModal = false; this.loadTags(); this.loadAdvancedStats(); this.cdr.detectChanges(); }
      });
    }
  }

  supprimerTag(id: number): void {
    if (!confirm('Supprimer ce tag ?')) return;
    this.http.delete(`${API}/tags/${id}`).subscribe({
      next: () => { this.loadTags(); this.loadAdvancedStats(); this.cdr.detectChanges(); }
    });
  }

  // ===== HELPERS =====
  getInitials(): string {
    if (!this.currentUser) return '?';
    return `${(this.currentUser.prenom || '?')[0]}${(this.currentUser.nom || '?')[0]}`.toUpperCase();
  }

  getRoleClass(role: string): string {
    const map: any = { 'ADMIN': 'role-admin', 'CANDIDAT': 'role-candidat', 'RECRUTEUR': 'role-recruteur' };
    return map[role] || '';
  }

  getCategorieColor(categorie: string): string {
    const map: any = {
      'Backend':     '#6366f1',
      'Frontend':    '#ec4899',
      'DevOps':      '#f59e0b',
      'Data':        '#3b82f6',
      'Mobile':      '#8b5cf6',
      'Cloud':       '#0ea5e9',
      'Base de données': '#14b8a6',
      'Outils':      '#64748b',
      'Langue':      '#10b981',
      'TECH':        '#6366f1',
      'Design':      '#10b981',
      'Soft Skills': '#94a3b8',
      'Autre':       '#64748b',
    };
    return map[categorie] || '#6366f1';
  }

  get categoriesForDisplay(): string[] {
    const categories = [...new Set(
      this.filteredTags
        .map((tag) => this.normalizeCategorie(tag?.categorie))
        .filter((categorie) => !!categorie)
    )] as string[];

    return this.sortCategories(categories);
  }

  get categoriesForForm(): string[] {
    const categoriesFromTags = this.tags
      .map((tag) => this.normalizeCategorie(tag?.categorie))
      .filter((categorie) => !!categorie);

    const merged = [...new Set([...this.defaultCategories, ...categoriesFromTags])];
    return this.sortCategories(merged);
  }

  get isCustomCategorySelected(): boolean {
    return this.normalizeCategorie(this.tagForm?.get('categorie')?.value) === this.customCategoryValue;
  }

  get selectedCategoryForPreview(): string {
    return this.isCustomCategorySelected
      ? this.normalizeCategorie(this.newCategoryName) || 'Autre'
      : this.normalizeCategorie(this.tagForm?.get('categorie')?.value) || 'Autre';
  }

  get isTagSubmitDisabled(): boolean {
    return this.tagForm.invalid || (this.isCustomCategorySelected && !this.normalizeCategorie(this.newCategoryName));
  }

  onCategorieChange(): void {
    if (!this.isCustomCategorySelected) {
      this.newCategoryName = '';
    }
  }

  getTagsByCategorie(categorie: string): any[] {
    return this.filteredTags.filter(tag => this.normalizeCategorie(tag.categorie) === this.normalizeCategorie(categorie));
  }

  private normalizeCategorie(categorie: unknown): string {
    return typeof categorie === 'string' ? categorie.trim() : '';
  }

  private getSelectedCategorie(): string {
    if (this.isCustomCategorySelected) {
      return this.normalizeCategorie(this.newCategoryName);
    }
    return this.normalizeCategorie(this.tagForm.get('categorie')?.value);
  }

  private sortCategories(categories: string[]): string[] {
    const order = new Map<string, number>([
      ['Backend', 1],
      ['TECH', 2],
      ['Frontend', 3],
      ['Mobile', 4],
      ['DevOps', 5],
      ['Cloud', 6],
      ['Base de données', 7],
      ['Outils', 8],
      ['Langue', 9],
      ['Data', 10],
      ['Design', 11],
      ['Soft Skills', 12],
      ['Autre', 99],
    ]);

    return [...categories].sort((a, b) => {
      const rankA = order.get(a) ?? 1000;
      const rankB = order.get(b) ?? 1000;
      if (rankA !== rankB) {
        return rankA - rankB;
      }
      return a.localeCompare(b, 'fr', { sensitivity: 'base' });
    });
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