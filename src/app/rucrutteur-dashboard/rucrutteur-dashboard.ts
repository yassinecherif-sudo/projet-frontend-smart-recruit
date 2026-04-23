import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

const API = 'http://localhost:8083';

@Component({
  selector: 'app-rucrutteur-dashboard',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule,
    MatIconModule, MatButtonModule,
  ],
  templateUrl: './rucrutteur-dashboard.html',
  styleUrl: './rucrutteur-dashboard.scss',
})
export class RucrutteurDashboard implements OnInit {

  activeSection = 'dashboard';
  currentUser: any = null;

  // Offres
  offres: any[] = [];
  showOffreModal = false;
  editMode = false;
  selectedOffre: any = null;
  offreForm!: FormGroup;

  // Tags disponibles
  allTags: any[] = [];
  selectedTags: any[] = [];

  // Candidatures
  candidatures: any[] = [];
  selectedOffreId: number | null = null;
  filtreStatut = '';
  filtreScore = 0;

  // Statistiques
  stats: any = null;

  typeContrats = ['CDI', 'CDD', 'STAGE', 'FREELANCE'];
  niveaux = ['JUNIOR', 'CONFIRME', 'SENIOR'];
  niveauxExpertise = ['DEBUTANT', 'INTERMEDIAIRE', 'EXPERT'];
  statutsKanban = ['A_TRIER', 'ENTRETIEN', 'RETENU', 'REFUSE'];

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {
    const stored = this.getStorageItem('utilisateur');
    this.currentUser = stored
      ? JSON.parse(stored)
      : { id: 1, prenom: 'Demo', nom: 'Recruteur', role: 'RECRUTEUR' };

    this.initOffreForm();
    this.loadOffres();
    this.loadAllTags();
    this.loadStats();
  }

  // ===== FORM =====
  initOffreForm(): void {
    this.offreForm = this.fb.group({
      titre:                  ['', Validators.required],
      description:            ['', Validators.required],
      typeContrat:            ['CDI', Validators.required],
      departement:            [''],
      localisation:           ['', Validators.required],
      niveauExperienceRequis: ['JUNIOR'],
      salaire:                [null],
      avantages:              [''],
      scoreMinimum:           [50],
      nbCandidatsMax:         [10],
      dateCloture:            [''],
    });
  }

  // ===== OFFRES =====
  loadOffres(): void {
    this.http.get<any[]>(`${API}/offres/recruteur/${this.currentUser.id}`).subscribe({
      next: (data) => this.offres = data,
      error: () => this.offres = []
    });
  }

  loadAllTags(): void {
    this.http.get<any[]>(`${API}/tags`).subscribe({
      next: (data) => this.allTags = data
    });
  }

  loadStats(): void {
    this.http.get<any>(`${API}/candidatures/statistiques/recruteur/${this.currentUser.id}`).subscribe({
      next: (data) => this.stats = data,
      error: () => this.stats = {
        totalCandidatures: 0,
        candidaturesATrier: 0,
        candidaturesEntretien: 0,
        candidaturesRetenues: 0,
        candidaturesRefusees: 0,
        scoreMoyen: 0
      }
    });
  }

  ouvrirCreerOffre(): void {
    this.editMode = false;
    this.selectedOffre = null;
    this.selectedTags = [];
    this.initOffreForm();
    this.showOffreModal = true;
  }

  ouvrirModifierOffre(offre: any): void {
    this.editMode = true;
    this.selectedOffre = offre;
    this.selectedTags = offre.tags ? offre.tags.map((t: any) => ({
      tagId: t.tagId,
      tagLibelle: t.tagLibelle,
      obligatoire: t.obligatoire,
      poids: t.poids,
      niveauMinimum: t.niveauMinimum
    })) : [];
    this.offreForm.patchValue({
      titre: offre.titre,
      description: offre.description,
      typeContrat: offre.typeContrat,
      departement: offre.departement,
      localisation: offre.localisation,
      niveauExperienceRequis: offre.niveauExperienceRequis,
      salaire: offre.salaire,
      avantages: offre.avantages,
      scoreMinimum: offre.scoreMinimum,
      nbCandidatsMax: offre.nbCandidatsMax,
      dateCloture: offre.dateCloture,
    });
    this.showOffreModal = true;
  }

  ajouterTagOffre(tag: any): void {
    if (this.selectedTags.find(t => t.tagId === tag.id)) return;
    this.selectedTags.push({
      tagId: tag.id,
      tagLibelle: tag.libelle,
      obligatoire: true,
      poids: 10,
      niveauMinimum: 'DEBUTANT'
    });
  }

  isTagSelected(tagId: number): boolean {
    return this.selectedTags.some(t => t.tagId === tagId);
  }

  supprimerTagOffre(tagId: number): void {
    this.selectedTags = this.selectedTags.filter(t => t.tagId !== tagId);
  }

  soumettreOffre(): void {
    if (this.offreForm.invalid) return;
    const payload = {
      ...this.offreForm.value,
      recruteurId: this.currentUser.id,
      tags: this.selectedTags
    };

    if (this.editMode && this.selectedOffre) {
      this.http.put(`${API}/offres/${this.selectedOffre.id}`, payload).subscribe({
        next: () => { this.showOffreModal = false; this.loadOffres(); }
      });
    } else {
      this.http.post(`${API}/offres`, payload).subscribe({
        next: () => { this.showOffreModal = false; this.loadOffres(); }
      });
    }
  }

  cloturerOffre(id: number): void {
    this.http.patch(`${API}/offres/${id}/cloturer`, {}).subscribe({
      next: () => this.loadOffres()
    });
  }

  supprimerOffre(id: number): void {
    if (!confirm('Supprimer cette offre ?')) return;
    this.http.delete(`${API}/offres/${id}`).subscribe({
      next: () => this.loadOffres()
    });
  }

  // ===== CANDIDATURES =====
  voirCandidatures(offreId: number): void {
    this.selectedOffreId = offreId;
    this.activeSection = 'candidatures';
    this.loadCandidatures();
  }

  loadCandidatures(): void {
    if (!this.selectedOffreId) return;

    let url = `${API}/candidatures/offre/${this.selectedOffreId}/tri-score`;

    if (this.filtreScore > 0) {
      url = `${API}/candidatures/offre/${this.selectedOffreId}/score-min?scoreMin=${this.filtreScore}`;
    }
    if (this.filtreStatut) {
      url = `${API}/candidatures/offre/${this.selectedOffreId}/statut?statut=${this.filtreStatut}`;
    }

    this.http.get<any[]>(url).subscribe({
      next: (data) => this.candidatures = data,
      error: () => this.candidatures = []
    });
  }

  getCandidateName(candidature: any): string {
    const candidat = candidature?.candidat ?? candidature?.utilisateur ?? candidature;
    const nom = candidature?.candidatNom ?? candidat?.nom ?? '';
    const prenom = candidature?.candidatPrenom ?? candidat?.prenom ?? '';
    const fullName = `${prenom} ${nom}`.trim();
    return fullName || 'Candidat';
  }

  getCandidateEmail(candidature: any): string {
    const candidat = candidature?.candidat ?? candidature?.utilisateur ?? candidature;
    return candidature?.candidatEmail ?? candidat?.email ?? '';
  }

  getCandidatePhone(candidature: any): string {
    const candidat = candidature?.candidat ?? candidature?.utilisateur ?? candidature;
    return candidature?.candidatTelephone ?? candidat?.telephone ?? '';
  }

  getCandidateLocation(candidature: any): string {
    const candidat = candidature?.candidat ?? candidature?.utilisateur ?? candidature;
    return candidature?.candidatVille ?? candidat?.ville ?? candidature?.localisation ?? candidat?.localisation ?? '';
  }

  hasCandidateContact(candidature: any): boolean {
    return !!(this.getCandidateEmail(candidature) || this.getCandidatePhone(candidature) || this.getCandidateLocation(candidature));
  }

  changerStatut(candidatureId: number, statut: string): void {
    this.http.patch(`${API}/candidatures/${candidatureId}/statut?statut=${statut}`, {}).subscribe({
      next: () => this.loadCandidatures()
    });
  }

  // ===== HELPERS =====
  getInitials(): string {
    if (!this.currentUser) return '?';
    return `${(this.currentUser.prenom || '?')[0]}${(this.currentUser.nom || '?')[0]}`.toUpperCase();
  }

  getScoreColor(score: number): string {
    if (score >= 70) return '#22c55e';
    if (score >= 50) return '#f59e0b';
    return '#ef4444';
  }

  getStatutClass(statut: string): string {
    const map: any = {
      'A_TRIER': 'statut-trier',
      'ENTRETIEN': 'statut-entretien',
      'RETENU': 'statut-retenu',
      'REFUSE': 'statut-refuse'
    };
    return map[statut] || '';
  }

  getStatutOffreClass(statut: string): string {
    const map: any = {
      'OUVERTE': 'offre-ouverte',
      'FERMEE': 'offre-fermee',
      'ARCHIVEE': 'offre-archivee'
    };
    return map[statut] || '';
  }

  getOffreTitle(): string {
    const offre = this.offres.find(o => o.id === this.selectedOffreId);
    return offre?.titre || '';
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