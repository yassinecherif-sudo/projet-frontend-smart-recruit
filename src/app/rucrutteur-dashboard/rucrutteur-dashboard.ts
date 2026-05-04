import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';



const API = 'http://localhost:8083';

@Component({
  selector: 'app-rucrutteur-dashboard',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule,
    MatIconModule,
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

  // ── Gestion Tags ──────────────────────────────────────────
  showTagForm = false;
  newTagLibelle = '';
  newTagCategorie = 'TECHNIQUE';
  newTagCategorieCustom = '';
  readonly customTagCategoryValue = '__CUSTOM__';
  tagCategories = ['TECHNIQUE', 'SOFT_SKILL', 'LANGUE', 'OUTIL', 'METHODOLOGIE'];

  // ── Agent IA ──────────────────────────────────────────────
  iaGenerating = false;
  iaQuestionsPanel: { questions: string[]; candidatNom: string; loading: boolean } | null = null;

  // Candidatures
  candidatures: any[] = [];
  selectedOffreId: number | null = null;
  filtreStatut = '';
  filtreScore = 0;

  // ── Drag & Drop ──────────────────────────────────────────
  draggingId: number | null = null;
  draggingCandidat: any = null;
  dragOverStatut: string | null = null;

  // Statistiques
  stats: any = null;

  // ── Notifications ─────────────────────────────────────────
  notifications: any[] = [];
  showNotifPanel = false;
  get nbNonLues(): number {
    return this.notifications.filter(n => !n.lu).length;
  }

  typeContrats = ['CDI', 'CDD', 'STAGE', 'FREELANCE'];
  niveaux = ['JUNIOR', 'CONFIRME', 'SENIOR'];
  niveauxExpertise = ['DEBUTANT', 'INTERMEDIAIRE', 'EXPERT'];
  statutsKanban = ['A_TRIER', 'ENTRETIEN', 'RETENU', 'REFUSE'];

  get isCustomTagCategorySelected(): boolean {
    return this.newTagCategorie === this.customTagCategoryValue;
  }

  get offresByStatutSections(): Array<{ key: string; title: string; offres: any[] }> {
    const sections = [
      { key: 'OUVERTE', title: 'Offres ouvertes' },
      { key: 'FERMEE', title: 'Offres fermées' },
      { key: 'ARCHIVEE', title: 'Offres archivées' },
    ];

    return sections
      .map(section => ({
        ...section,
        offres: this.offres.filter(offre => offre?.statut === section.key),
      }))
      .filter(section => section.offres.length > 0);
  }

  get groupedTagsForDisplay(): Array<{ categorie: string; label: string; tags: any[] }> {
    const grouped = new Map<string, any[]>();

    for (const tag of this.allTags) {
      const categorie = this.normalizeCategorie(tag?.categorie);
      const existing = grouped.get(categorie) || [];
      existing.push(tag);
      grouped.set(categorie, existing);
    }

    const preferredOrder = this.tagCategories;
    const categories = Array.from(grouped.keys()).sort((a, b) => {
      const aIndex = preferredOrder.indexOf(a);
      const bIndex = preferredOrder.indexOf(b);
      if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });

    return categories.map(categorie => {
      const tags = (grouped.get(categorie) || []).sort((a, b) =>
        String(a?.libelle || '').localeCompare(String(b?.libelle || ''))
      );
      return { categorie, label: this.getCategoryLabel(categorie), tags };
    });
  }

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
      : { id: 1, prenom: 'Demo', nom: 'Recruteur', role: 'RECRUTEUR' };

    this.initOffreForm();
    this.loadOffres();
    this.loadAllTags();
    this.loadStats();
    this.loadNotifications();
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
      next: (data) => {
        this.offres = data;
        this.cdr.detectChanges();
      },
      error: () => {
        this.offres = [];
        this.cdr.detectChanges();
      }
    });
  }

  loadAllTags(): void {
    this.http.get<any[]>(`${API}/tags`).subscribe({
      next: (data) => {
        this.allTags = data;
        this.cdr.detectChanges();
      }
    });
  }

  loadStats(): void {
    this.http.get<any>(`${API}/candidatures/statistiques/recruteur/${this.currentUser.id}`).subscribe({
      next: (data) => {
        this.stats = {
          totalCandidatures: data?.totalCandidatures ?? 0,
          candidaturesATrier: data?.atrier ?? data?.candidaturesATrier ?? 0,
          candidaturesEntretien: data?.entretien ?? data?.candidaturesEntretien ?? 0,
          candidaturesRetenues: data?.retenu ?? data?.candidaturesRetenues ?? 0,
          candidaturesRefusees: data?.refuse ?? data?.candidaturesRefusees ?? 0,
          scoreMoyen: data?.scoreMoyen ?? 0,
        };
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Erreur stats:', err);
        this.stats = {
          totalCandidatures: 0, candidaturesATrier: 0,
          candidaturesEntretien: 0, candidaturesRetenues: 0,
          candidaturesRefusees: 0, scoreMoyen: 0
        };
        this.cdr.detectChanges();
      }
    });
  }

  ouvrirCreerOffre(): void {
    this.editMode = false;
    this.selectedOffre = null;
    this.selectedTags = [];
    this.initOffreForm();
    this.showOffreModal = true;
    this.cdr.detectChanges();
  }

  ouvrirModifierOffre(offre: any): void {
    this.editMode = true;
    this.selectedOffre = offre;
    this.selectedTags = offre.tags ? offre.tags.map((t: any) => ({
      tagId: t.tagId, tagLibelle: t.tagLibelle,
      obligatoire: t.obligatoire, poids: t.poids, niveauMinimum: t.niveauMinimum
    })) : [];
    this.offreForm.patchValue({
      titre: offre.titre, description: offre.description, typeContrat: offre.typeContrat,
      departement: offre.departement, localisation: offre.localisation,
      niveauExperienceRequis: offre.niveauExperienceRequis, salaire: offre.salaire,
      avantages: offre.avantages, scoreMinimum: offre.scoreMinimum,
      nbCandidatsMax: offre.nbCandidatsMax, dateCloture: offre.dateCloture,
    });
    this.showOffreModal = true;
    this.cdr.detectChanges();
  }

  ajouterTagOffre(tag: any): void {
    if (this.selectedTags.find(t => t.tagId === tag.id)) return;
    this.selectedTags.push({
      tagId: tag.id, tagLibelle: tag.libelle,
      obligatoire: true, poids: 10, niveauMinimum: 'DEBUTANT'
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
    const payload = { ...this.offreForm.value, recruteurId: this.currentUser.id, tags: this.selectedTags };
    if (this.editMode && this.selectedOffre) {
      this.http.put(`${API}/offres/${this.selectedOffre.id}`, payload).subscribe({
        next: () => { this.showOffreModal = false; this.loadOffres(); this.cdr.detectChanges(); }
      });
    } else {
      this.http.post(`${API}/offres`, payload).subscribe({
        next: () => { this.showOffreModal = false; this.loadOffres(); this.cdr.detectChanges(); }
      });
    }
  }

  cloturerOffre(id: number): void {
    if (!confirm('Clôturer cette offre ?')) return;
    this.http.patch(`${API}/offres/${id}/cloturer`, {}).subscribe({
      next: () => {
        this.loadOffres();
        this.cdr.detectChanges();
      }
    });
  }

  archiverOffre(id: number): void {
    if (!confirm('Archiver cette offre ?')) return;
    this.http.patch(`${API}/offres/${id}/archiver`, {}).subscribe({
      next: () => {
        this.loadOffres();
        this.cdr.detectChanges();
      },
      error: () => this.http.patch(`${API}/offres/${id}/statut?statut=ARCHIVEE`, {}).subscribe({
        next: () => {
          this.loadOffres();
          this.cdr.detectChanges();
        }
      })
    });
  }

  rouvrirOffre(id: number): void {
    if (!confirm('Rouvrir cette offre ?')) return;
    this.http.patch(`${API}/offres/${id}/rouvrir`, {}).subscribe({
      next: () => {
        this.loadOffres();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Erreur rouvrir:', err);
        alert('Erreur: ' + (err?.error?.message || 'Impossible de rouvrir l\'offre'));
      }
    });
  }

  getStatutOffreLabel(statut: string): string {
    const map: any = { 'OUVERTE': 'Ouverte', 'FERMEE': 'Fermée', 'ARCHIVEE': 'Archivée' };
    return map[statut] || statut;
  }

  peutCloturer(offre: any): boolean { return offre.statut === 'OUVERTE'; }
  peutArchiver(offre: any): boolean { return offre.statut === 'FERMEE' || offre.statut === 'OUVERTE'; }
  peutRouvrir(offre: any): boolean  { return offre.statut === 'FERMEE' || offre.statut === 'ARCHIVEE'; }

  supprimerOffre(id: number): void {
    if (!confirm('Supprimer cette offre ?')) return;
    this.http.delete(`${API}/offres/${id}`).subscribe({
      next: () => {
        this.loadOffres();
        this.cdr.detectChanges();
      }
    });
  }

  // ===== CANDIDATURES =====
  voirCandidatures(offreId: number): void {
    this.selectedOffreId = offreId;
    this.activeSection = 'candidatures';
    this.cdr.detectChanges();
    this.loadCandidatures();
  }

  loadCandidatures(): void {
    // "Toutes les offres" → selectedOffreId === 0 ou null
    if (!this.selectedOffreId) {
      this.http.get<any[]>(`${API}/candidatures/recruteur/${this.currentUser.id}`).subscribe({
        next: (data) => { this.candidatures = data; this.cdr.detectChanges(); },
        error: () => { this.candidatures = []; this.cdr.detectChanges(); }
      });
      return;
    }

    let url = `${API}/candidatures/offre/${this.selectedOffreId}/tri-score`;
    if (this.filtreScore > 0) url = `${API}/candidatures/offre/${this.selectedOffreId}/score-min?scoreMin=${this.filtreScore}`;
    if (this.filtreStatut)    url = `${API}/candidatures/offre/${this.selectedOffreId}/statut?statut=${this.filtreStatut}`;

    this.http.get<any[]>(url).subscribe({
      next: (data) => { this.candidatures = data; this.cdr.detectChanges(); },
      error: () => { this.candidatures = []; this.cdr.detectChanges(); }
    });
  }

  getCandidateName(candidature: any): string {
    const candidat = candidature?.candidat ?? candidature?.utilisateur ?? candidature;
    const nom = candidature?.candidatNom ?? candidat?.nom ?? '';
    const prenom = candidature?.candidatPrenom ?? candidat?.prenom ?? '';
    return `${prenom} ${nom}`.trim() || 'Candidat';
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
      next: () => {
        this.loadCandidatures();
        this.cdr.detectChanges();
      }
    });
  }

  // ===== GESTION TAGS =====
  onTagCategorieChange(): void {
    if (!this.isCustomTagCategorySelected) {
      this.newTagCategorieCustom = '';
    }
  }

  resetTagCreationForm(): void {
    this.newTagLibelle = '';
    this.newTagCategorie = 'TECHNIQUE';
    this.newTagCategorieCustom = '';
  }

  creerTag(): void {
    if (!this.newTagLibelle.trim()) return;
    const customCategorie = this.newTagCategorieCustom.trim();
    if (this.isCustomTagCategorySelected && !customCategorie) return;

    const categorie = this.isCustomTagCategorySelected
      ? this.normalizeCategorie(customCategorie)
      : this.newTagCategorie;

    const payload = { libelle: this.newTagLibelle.trim(), categorie };
    this.http.post<any>(`${API}/tags`, payload).subscribe({
      next: () => {
        if (!this.tagCategories.includes(categorie)) {
          this.tagCategories = [...this.tagCategories, categorie];
        }
        this.loadAllTags();
        this.resetTagCreationForm();
        this.showTagForm = false;
        this.cdr.detectChanges();
      },
      error: (err) => alert(err?.error?.message || 'Erreur lors de la création du tag')
    });
  }

  // ===== AGENT IA =====
  genererDescriptionIA(): void {
    const titre = this.offreForm.get('titre')?.value;
    if (!titre || titre.trim().length < 3) {
      alert("Saisissez d'abord le titre du poste.");
      return;
    }
    this.iaGenerating = true;
    const payload = {
      titrePoste: titre,
      typeContrat: this.offreForm.get('typeContrat')?.value || '',
      niveauExperience: this.offreForm.get('niveauExperienceRequis')?.value || '',
      localisation: this.offreForm.get('localisation')?.value || '',
    };
    this.http.post<any>(`${API}/agent-ia/description`, payload).subscribe({
      next: (res) => {
        this.iaGenerating = false;
        if (res.success && res.description) {
          this.offreForm.patchValue({ description: res.description });
        }
      },
      error: () => {
        this.iaGenerating = false;
        alert('Erreur IA. Vérifiez votre clé API dans application.properties.');
      }
    });
  }

  ouvrirQuestionsIA(candidature: any): void {
    const nom = this.getCandidateName(candidature);
    const titreOffre = this.getOffreTitle();
    this.iaQuestionsPanel = { questions: [], candidatNom: nom, loading: true };
    this.cdr.detectChanges();
    const payload = { nomCandidat: nom, titreOffre: titreOffre, tagsManquants: [] };
    this.http.post<any>(`${API}/agent-ia/questions`, payload).subscribe({
      next: (res) => {
        this.iaQuestionsPanel = { questions: res.questions || [], candidatNom: nom, loading: false };
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Erreur IA:', err);
        this.iaQuestionsPanel = { questions: ['Erreur lors de la génération.'], candidatNom: nom, loading: false };
        this.cdr.detectChanges();
      }
    });
  }

  fermerQuestionsIA(): void {
    this.iaQuestionsPanel = null;
    this.cdr.detectChanges();
  }

  // ── Drag & Drop ──────────────────────────────────────────
  onDragStart(event: DragEvent, candidature: any): void {
    this.draggingId = candidature.id;
    this.draggingCandidat = candidature;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', String(candidature.id));
    }
  }

  onDragEnd(): void {
    this.draggingId = null;
    this.draggingCandidat = null;
    this.dragOverStatut = null;
    this.cdr.detectChanges();
  }

  onDragOver(event: DragEvent, statut: string): void {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    this.dragOverStatut = statut;
  }

  onDragLeave(): void { this.dragOverStatut = null; }

  onDrop(event: DragEvent, nouveauStatut: string): void {
    event.preventDefault();
    this.dragOverStatut = null;
    if (!this.draggingCandidat) return;
    if (this.draggingCandidat.statut === nouveauStatut) return;
    const candidature = this.candidatures.find(c => c.id === this.draggingCandidat.id);
    if (candidature) candidature.statut = nouveauStatut;
    this.http.patch(`${API}/candidatures/${this.draggingCandidat.id}/statut?statut=${nouveauStatut}`, {}).subscribe({
      next: () => {
        this.loadCandidatures();
        this.cdr.detectChanges();
      },
      error: () => { if (candidature) candidature.statut = this.draggingCandidat.statut; }
    });
    this.draggingId = null;
    this.draggingCandidat = null;
  }

  getCandidaturesByStatut(statut: string): any[] {
    return this.candidatures.filter(c => c.statut === statut);
  }

  getStatutLabel(statut: string): string {
    const map: any = { 'A_TRIER': 'À trier', 'ENTRETIEN': 'Entretien', 'RETENU': 'Retenu', 'REFUSE': 'Refusé' };
    return map[statut] || statut;
  }

  getStatutIcon(statut: string): string {
    const map: any = { 'A_TRIER': '📥', 'ENTRETIEN': '💬', 'RETENU': '✅', 'REFUSE': '❌' };
    return map[statut] || '•';
  }

  // ===== NOTIFICATIONS =====
  loadNotifications(): void {
    if (!this.currentUser?.id) return;
    this.http.get<any[]>(`${API}/notifications/utilisateur/${this.currentUser.id}`).subscribe({
      next: (data) => {
        this.notifications = data.sort((a, b) =>
          new Date(b.dateEnvoi).getTime() - new Date(a.dateEnvoi).getTime());
        this.cdr.detectChanges();
      },
      error: () => {
        this.notifications = [];
        this.cdr.detectChanges();
      }
    });
  }

  toggleNotifPanel(): void { this.showNotifPanel = !this.showNotifPanel; }

  marquerLue(id: number): void {
    this.http.patch(`${API}/notifications/${id}/lue`, {}).subscribe({
      next: () => {
        const n = this.notifications.find(n => n.id === id);
        if (n) n.lu = true;
        this.cdr.detectChanges();
      }
    });
  }

  marquerToutesLues(): void {
    this.http.patch(`${API}/notifications/utilisateur/${this.currentUser.id}/toutes-lues`, {}).subscribe({
      next: () => {
        this.notifications.forEach(n => n.lu = true);
        this.cdr.detectChanges();
      }
    });
  }

  getNotifIcon(type: string): string {
    const map: any = { 'CANDIDATURE': 'assignment_turned_in', 'OFFRE': 'work_outline', 'STATUT': 'swap_horiz', 'EMAIL': 'email', 'SYSTEME': 'info' };
    return map[type] || 'notifications';
  }

  getNotifColor(type: string): string {
    const map: any = { 'CANDIDATURE': '#185fa5', 'OFFRE': '#3b6d11', 'STATUT': '#854f0b', 'EMAIL': '#534ab7', 'SYSTEME': '#888780' };
    return map[type] || '#888780';
  }

  formatNotifDate(dateStr: string): string {
    const date = new Date(dateStr);
    const diffMs = new Date().getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffH = Math.floor(diffMin / 60);
    const diffD = Math.floor(diffH / 24);
    if (diffMin < 1) return "À l'instant";
    if (diffMin < 60) return `il y a ${diffMin}min`;
    if (diffH < 24) return `il y a ${diffH}h`;
    return `il y a ${diffD}j`;
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
    const map: any = { 'A_TRIER': 'statut-trier', 'ENTRETIEN': 'statut-entretien', 'RETENU': 'statut-retenu', 'REFUSE': 'statut-refuse' };
    return map[statut] || '';
  }

  getStatutOffreClass(statut: string): string {
    const map: any = { 'OUVERTE': 'offre-ouverte', 'FERMEE': 'offre-fermee', 'ARCHIVEE': 'offre-archivee' };
    return map[statut] || '';
  }

  getOffreTitle(): string {
    if (!this.selectedOffreId) return 'Toutes les offres';
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

  private normalizeCategorie(value: string): string {
    return String(value || '')
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '_');
  }

  private getCategoryLabel(categorie: string): string {
    return categorie
      .toLowerCase()
      .split('_')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }
}