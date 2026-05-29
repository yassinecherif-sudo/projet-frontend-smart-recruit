import { Component, OnInit, ChangeDetectorRef, HostListener } from '@angular/core';
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
  styleUrls: ['./rucrutteur-dashboard.scss'],
})
export class RucrutteurDashboard implements OnInit {

  activeSection = 'dashboard';
  sectionHistory: string[] = [];
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

  // â”€â”€ Gestion Tags â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  showTagForm = false;
  newTagLibelle = '';
  newTagCategorie = 'TECHNIQUE';
  newTagCategorieCustom = '';
  readonly customTagCategoryValue = '__CUSTOM__';
  tagCategories = ['TECHNIQUE', 'SOFT_SKILL', 'LANGUE', 'OUTIL', 'METHODOLOGIE'];
  // Tag search
  tagSearch = '';

  // â”€â”€ Agent IA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  iaGenerating = false;
  iaQuestionsPanel: {
    questions: string[];
    candidatNom: string;
    candidatEmail: string;
    candidatId: number | null;
    candidatureId: number | null;
    loading: boolean;
  } | null = null;
  questionsEnvoyees: Record<number, Array<{ dateEnvoi: string; questions: string[] }>> = {};

  // Candidatures
  candidatures: any[] = [];
  selectedOffreId: number | null = null;
  filtreStatut = '';
  filtreScore = 0;

  // â”€â”€ Drag & Drop â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  draggingId: number | null = null;
  draggingCandidat: any = null;
  dragOverStatut: string | null = null;

  // Statistiques
  stats: any = null;

  // â”€â”€ Notifications â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  notifications: any[] = [];
  showNotifPanel = false;
  // Toast / notification replacement for native alerts
  toast: { message: string; sub?: string; type?: 'success'|'error'|'info'|'ia' } | null = null;
  private toastTimer: any = null;
  confirmDialog: { message: string; action: () => void; } | null = null;
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
      { key: 'FERMEE', title: 'Offres fermÃ©es' },
      { key: 'ARCHIVEE', title: 'Offres archivÃ©es' },
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

    if (typeof window !== 'undefined') this.seedSectionHistory();

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
    // clear search after selection
    this.tagSearch = '';
  }

  get tagSuggestions(): any[] {
    const q = String(this.tagSearch || '').trim().toLowerCase();
    if (!q) return [];
    return (this.allTags || [])
      .filter(t => String(t.libelle || '').toLowerCase().startsWith(q))
      .filter(t => !this.selectedTags.some(st => st.tagId === t.id))
      .slice(0, 12);
  }

  get filteredGroupedTagsForDisplay(): Array<{ categorie: string; label: string; tags: any[] }> {
    const q = String(this.tagSearch || '').trim().toLowerCase();
    if (!q) return this.groupedTagsForDisplay;
    return this.groupedTagsForDisplay
      .map(group => ({
        ...group,
        tags: (group.tags || []).filter(t => String(t.libelle || '').toLowerCase().startsWith(q))
      }))
      .filter(g => (g.tags || []).length > 0);
  }

  get currentTagGroups(): Array<{ categorie: string; label: string; tags: any[] }> {
    return this.tagSearch ? this.filteredGroupedTagsForDisplay : this.groupedTagsForDisplay;
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
    this.ouvrirConfirm('Clôturer cette offre ? Les candidatures seront toujours visibles.', () => {
      this.http.patch(`${API}/offres/${id}/cloturer`, {}).subscribe({
        next: () => { this.loadOffres(); this.showToast('Offre clôturée', 'success'); this.cdr.detectChanges(); },
        error: (err) => { console.error('Erreur cloturer:', err); this.showToast('Erreur lors de la clôture', 'error'); }
      });
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
        this.showToast('Erreur: ' + (err?.error?.message || 'Impossible de rouvrir l\'offre'), 'error');
      }
    });
  }

  getStatutOffreLabel(statut: string): string {
    const map: any = { 'OUVERTE': 'Ouverte', 'FERMEE': 'FermÃ©e', 'ARCHIVEE': 'ArchivÃ©e' };
    return map[statut] || statut;
  }

  peutCloturer(offre: any): boolean { return offre.statut === 'OUVERTE'; }
  peutArchiver(offre: any): boolean { return offre.statut === 'FERMEE' || offre.statut === 'OUVERTE'; }
  peutRouvrir(offre: any): boolean  { return offre.statut === 'FERMEE' || offre.statut === 'ARCHIVEE'; }

  supprimerOffre(id: number): void {
    this.ouvrirConfirm('Supprimer définitivement cette offre ?', () => {
      this.http.delete(`${API}/offres/${id}`).subscribe({
        next: () => { this.loadOffres(); this.showToast('Offre supprimée', 'success'); this.cdr.detectChanges(); },
        error: (err) => { console.error('Erreur supprimer:', err); this.showToast('Erreur lors de la suppression', 'error'); }
      });
    });
  }

  // ===== CANDIDATURES =====
  voirCandidatures(offreId: number): void {
    this.selectedOffreId = offreId;
    this.naviguerVers('candidatures');
    this.cdr.detectChanges();
    this.loadCandidatures();
  }

  loadCandidatures(): void {
    // Aucun choix â†’ ne rien afficher
    if (this.selectedOffreId === null || this.selectedOffreId === undefined) {
      this.candidatures = [];
      this.cdr.detectChanges();
      return;
    }

    // "Toutes les offres" â†’ selectedOffreId === 0
    if (this.selectedOffreId === 0) {
      this.http.get<any[]>(`${API}/candidatures/recruteur/${this.currentUser.id}`).subscribe({
        next: (data) => {
          console.log('Candidatures chargÃ©es:', data);
          this.enrichirCandidaturesAvecDetails(this.filtrerCandidatures(data)).then(() => {
            this.cdr.detectChanges();
          });
        },
        error: (err) => { console.error('Erreur:', err); this.candidatures = []; this.cdr.detectChanges(); }
      });
      return;
    }

    let url = `${API}/candidatures/offre/${this.selectedOffreId}/tri-score`;
    if (this.filtreScore > 0) url = `${API}/candidatures/offre/${this.selectedOffreId}/score-min?scoreMin=${this.filtreScore}`;
    if (this.filtreStatut)    url = `${API}/candidatures/offre/${this.selectedOffreId}/statut?statut=${this.filtreStatut}`;

    this.http.get<any[]>(url).subscribe({
      next: (data) => { 
        console.log('Candidatures chargÃ©es:', data);
        // Enrichir chaque candidature avec les dÃ©tails du candidat
        this.enrichirCandidaturesAvecDetails(data).then(() => {
          this.cdr.detectChanges();
        });
      },
      error: (err) => { console.error('Erreur:', err); this.candidatures = []; this.cdr.detectChanges(); }
    });
  }

  private async enrichirCandidaturesAvecDetails(candidatures: any[]): Promise<void> {
    const candidaturesEnrichies = await Promise.all(
      candidatures.map(async (c) => {
        try {
          const candidat = await this.http.get<any>(`${API}/candidats/${c.candidatId}`).toPromise();
          return {
            ...c,
            candidat: candidat || {}
          };
        } catch (err) {
          console.error(`Erreur lors du chargement du candidat ${c.candidatId}:`, err);
          return c;
        }
      })
    );
    this.candidatures = candidaturesEnrichies;
  }

  private filtrerCandidatures(candidatures: any[]): any[] {
    return candidatures.filter(candidature => {
      const score = Number(candidature?.scoreTotal ?? 0);
      const statut = candidature?.statut;
      const statutOk = !this.filtreStatut || statut === this.filtreStatut;
      const scoreOk = this.filtreScore <= 0 || score >= this.filtreScore;
      return statutOk && scoreOk;
    });
  }

  getCandidateName(candidature: any): string {
    const candidat = candidature?.candidat ?? candidature?.utilisateur ?? candidature;
    const nom = candidature?.candidatNom ?? candidat?.nom ?? '';
    const prenom = candidature?.candidatPrenom ?? candidat?.prenom ?? '';
    return `${prenom} ${nom}`.trim() || 'Candidat';
  }

  getCandidateEmail(candidature: any): string {
    if (!candidature) return '';
    // 1. Champs directs de la candidature
    if (candidature.candidatEmail) return candidature.candidatEmail;
    if (candidature.email) return candidature.email;
    // 2. Objet candidat/utilisateur
    const candidat = candidature.candidat || candidature.utilisateur;
    if (candidat?.email) return candidat.email;
    if (candidat?.candidatEmail) return candidat.candidatEmail;
    return '';
  }

  getCandidatePhone(candidature: any): string {
    if (!candidature) return '';
    // 1. Champs directs de la candidature
    if (candidature.candidatTelephone) return candidature.candidatTelephone;
    if (candidature.telephone) return candidature.telephone;
    // 2. Objet candidat/utilisateur
    const candidat = candidature.candidat || candidature.utilisateur;
    if (candidat?.telephone) return candidat.telephone;
    if (candidat?.candidatTelephone) return candidat.candidatTelephone;
    return '';
  }

  getCandidateLocation(candidature: any): string {
    if (!candidature) return '';
    // 1. Champs directs de la candidature
    if (candidature.candidatVille) return candidature.candidatVille;
    if (candidature.ville) return candidature.ville;
    if (candidature.localisation) return candidature.localisation;
    // 2. Objet candidat/utilisateur
    const candidat = candidature.candidat || candidature.utilisateur;
    if (candidat?.ville) return candidat.ville;
    if (candidat?.localisation) return candidat.localisation;
    if (candidat?.candidatVille) return candidat.candidatVille;
    return '';
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
      error: (err) => this.showToast(err?.error?.message || 'Erreur lors de la crÃ©ation du tag', 'error')
    });
  }

  // ===== AGENT IA =====
  genererDescriptionIA(): void {
    const titre = this.offreForm.get('titre')?.value;
    if (!titre || titre.trim().length < 3) {
      this.showToast("Saisissez d'abord le titre du poste.", 'error');
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
        this.showToast('Erreur IA. VÃ©rifiez votre clÃ© API dans application.properties.', 'error');
      }
    });
  }

  ouvrirQuestionsIA(candidature: any): void {
    const nom = this.getCandidateName(candidature);
    const titreOffre = this.getOffreTitle();
    const email = this.getCandidateEmail(candidature);
    const candidatId = this.getCandidateAccountId(candidature);
    this.iaQuestionsPanel = {
      questions: [],
      candidatNom: nom,
      candidatEmail: email,
      candidatId,
      candidatureId: candidature?.id ?? null,
      loading: true,
    };
    this.cdr.detectChanges();
    const payload = { nomCandidat: nom, titreOffre: titreOffre, tagsManquants: [] };
    this.http.post<any>(`${API}/agent-ia/questions`, payload).subscribe({
      next: (res) => {
        this.iaQuestionsPanel = {
          questions: res.questions || [],
          candidatNom: nom,
          candidatEmail: email,
          candidatId,
          candidatureId: candidature?.id ?? null,
          loading: false,
        };
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Erreur IA:', err);
        this.iaQuestionsPanel = {
          questions: ['Erreur lors de la gÃ©nÃ©ration.'],
          candidatNom: nom,
          candidatEmail: email,
          candidatId,
          candidatureId: candidature?.id ?? null,
          loading: false,
        };
        this.cdr.detectChanges();
      }
    });
  }

  envoyerQuestionsIA(): void {
    if (!this.iaQuestionsPanel || this.iaQuestionsPanel.loading) return;

    const candidatId = this.iaQuestionsPanel.candidatId;
    const candidatureId = this.iaQuestionsPanel.candidatureId;
    if (!candidatId) {
      this.showToast('Impossible dâ€™identifier le compte candidat Ã  cibler.', 'error');
      return;
    }

    const questions = this.iaQuestionsPanel.questions.filter(q => !!q?.trim());
    if (questions.length === 0) {
      this.showToast('Aucune question Ã  envoyer.', 'error');
      return;
    }

    const titreOffre = this.getOffreTitle();
    const corps = [
      `Bonjour ${this.iaQuestionsPanel.candidatNom},`,
      '',
      `Vous avez reÃ§u de nouvelles questions dâ€™entretien pour lâ€™offre : ${titreOffre}.`,
      '',
      'Voici les questions liÃ©es Ã  votre candidature :',
      '',
      ...questions.map((question, index) => `${index + 1}. ${question}`),
      '',
      'Cordialement,',
      `${this.currentUser?.prenom || ''} ${this.currentUser?.nom || ''}`.trim(),
    ].join('\n');

    const payload = {
      utilisateurId: candidatId,
      candidatId,
      recruteurId: this.currentUser?.id ?? null,
      candidatureId,
      type: 'QUESTIONS_ENTRETIEN',
      message: corps,
      sujet: `Questions d'entretien â€” ${this.iaQuestionsPanel.candidatNom}`,
      dateEnvoi: new Date().toISOString(),
      lu: false,
    };

    this.http.post<any>(`${API}/notifications`, payload).subscribe({
      next: () => {
        if (candidatureId) {
          const history = this.questionsEnvoyees[candidatureId] || [];
          this.questionsEnvoyees = {
            ...this.questionsEnvoyees,
            [candidatureId]: [...history, { dateEnvoi: new Date().toISOString(), questions }],
          };
        }
        this.showToast('Questions envoyÃ©es dans le compte du candidat.', 'success');
        this.fermerQuestionsIA();
      },
      error: (err) => {
        console.error('Erreur envoi questions:', err);
        this.showToast('Impossible dâ€™envoyer les questions dans le compte du candidat.', 'error');
      }
    });
  }

  showToast(message: string, type: 'success'|'error'|'info'|'ia' = 'info', sub = ''): void {
    this.toast = { message, sub, type };
    this.cdr.detectChanges();
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => { this.toast = null; this.cdr.detectChanges(); }, 6000);
  }
  ouvrirConfirm(message: string, action: () => void): void { this.confirmDialog = { message, action }; this.cdr.detectChanges(); }
  fermerConfirm(): void { this.confirmDialog = null; this.cdr.detectChanges(); }
  confirmerAction(): void { if (!this.confirmDialog) return; this.confirmDialog.action(); this.confirmDialog = null; this.cdr.detectChanges(); }

  private getCandidateAccountId(candidature: any): number | null {
    const candidat = candidature?.candidat ?? candidature?.utilisateur ?? {};
    const rawId = candidature?.candidatId ?? candidat?.id ?? candidat?.utilisateurId ?? candidature?.utilisateurId ?? null;
    const parsed = Number(rawId);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  getQuestionsEnvoyees(candidatureId: number | null | undefined): Array<{ dateEnvoi: string; questions: string[] }> {
    if (!candidatureId) return [];
    return this.questionsEnvoyees[candidatureId] || [];
  }

  getReponsesCandidat(candidatureId: number | null | undefined): any[] {
    if (!candidatureId) return [];
    return this.notifications.filter(notification =>
      notification?.type === 'REPONSE_ENTRETIEN' && Number(notification?.candidatureId) === Number(candidatureId)
    );
  }

  getReponsesCandidatOrganise(candidatureId: number | null | undefined): Array<{
    id: number | null;
    dateEnvoi: string;
    items: Array<{ question: string; reponse: string }>;
    rawMessage: string;
  }> {
    if (!candidatureId) return [];

    return this.getReponsesCandidat(candidatureId).map((reponse: any) => ({
      id: Number(reponse?.id) || null,
      dateEnvoi: reponse?.dateEnvoi || '',
      items: this.parseReponseEntretien(reponse?.message || ''),
      rawMessage: String(reponse?.message || ''),
    }));
  }

  getCandidaturesAvecReponses(): any[] {
    return this.candidatures.filter(c =>
      this.getQuestionsEnvoyees(c?.id).length > 0 || this.getReponsesCandidatOrganise(c?.id).length > 0
    );
  }

  private parseReponseEntretien(message: string): Array<{ question: string; reponse: string }> {
    const normalized = String(message || '')
      .replace(/\r?\n+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const compactItems: Array<{ question: string; reponse: string }> = [];
    const questionBlockRegex = /Question\s*\d*\s*:\s*([\s\S]*?)(?=\s*Question\s*\d*\s*:|$)/gi;
    const questionBlocks = [...normalized.matchAll(questionBlockRegex)];

    for (const block of questionBlocks) {
      const segment = String(block[1] || '').trim();
      if (!segment) continue;

      const parts = segment.split(/\s*RÃ©ponse\s*:\s*/i);
      const question = this.cleanResponseText(parts[0]);
      const reponse = this.cleanResponseText(parts.slice(1).join(' RÃ©ponse : '));

      compactItems.push({
        question: question || 'Question',
        reponse: reponse || 'RÃ©ponse non renseignÃ©e',
      });
    }

    if (compactItems.length > 0) {
      return compactItems;
    }

    const lines = String(message || '')
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean);

    const items: Array<{ question: string; reponse: string }> = [];
    let currentQuestion = '';
    let currentResponse = '';

    const pushCurrent = (): void => {
      if (currentQuestion || currentResponse) {
        items.push({
          question: this.cleanResponseText(currentQuestion) || 'Question',
          reponse: this.cleanResponseText(currentResponse) || 'RÃ©ponse non renseignÃ©e',
        });
      }
      currentQuestion = '';
      currentResponse = '';
    };

    for (const line of lines) {
      const questionMatch = line.match(/^Question\s*\d*\s*:\s*(.+)$/i);
      if (questionMatch) {
        pushCurrent();
        currentQuestion = questionMatch[1].trim();
        continue;
      }

      const responseMatch = line.match(/^RÃ©ponse\s*:\s*(.+)$/i);
      if (responseMatch) {
        currentResponse = responseMatch[1].trim();
        continue;
      }

      if (/^Bonjour/i.test(line) || /^Cordialement/i.test(line) || /^Voici mes rÃ©ponses/i.test(line)) {
        continue;
      }

      if (currentResponse) {
        currentResponse = `${currentResponse} ${line}`.trim();
      } else if (currentQuestion) {
        currentQuestion = `${currentQuestion} ${line}`.trim();
      }
    }

    pushCurrent();

    return items.length > 0 ? items : [{ question: 'RÃ©ponse du candidat', reponse: this.cleanResponseText(message) || 'Aucun dÃ©tail fourni' }];
  }

  private cleanResponseText(value: string): string {
    return String(value || '')
      .replace(/^Question\s*\d*\s*:\s*/i, '')
      .replace(/^RÃ©ponse\s*:\s*/i, '')
      .replace(/^Voici mes rÃ©ponses aux questions d'entretien\s*:?/i, '')
      .replace(/^Bonjour\s*,?/i, '')
      .replace(/^Cordialement\s*,?/i, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  fermerQuestionsIA(): void {
    this.iaQuestionsPanel = null;
    this.cdr.detectChanges();
  }

  // ===== CANDIDATURE DETAILS VIEW =====
  selectedCandidatureForDetails: any | null = null;

  openCandidatureDetails(candidature: any): void {
    if (!candidature) return;
    // ensure candidature is enriched (has candidat object) if possible
    this.selectedCandidatureForDetails = candidature;
    this.cdr.detectChanges();
  }

  closeCandidatureDetails(): void {
    this.selectedCandidatureForDetails = null;
    this.cdr.detectChanges();
  }

  // â”€â”€ Drag & Drop â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    const map: any = { 'A_TRIER': 'Ã€ trier', 'ENTRETIEN': 'Entretien', 'RETENU': 'Retenu', 'REFUSE': 'RefusÃ©' };
    return map[statut] || statut;
  }

  getStatutIcon(statut: string): string {
    const map: any = { 'A_TRIER': 'ðŸ“¥', 'ENTRETIEN': 'ðŸ’¬', 'RETENU': 'âœ…', 'REFUSE': 'âŒ' };
    return map[statut] || 'â€¢';
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

  ouvrirNotification(notification: any): void {
    if (!notification?.id) return;

    this.marquerLue(notification.id);

    const candidatureId = Number(notification?.candidatureId);
    if (candidatureId && (notification?.type === 'REPONSE_ENTRETIEN' || notification?.type === 'QUESTIONS_ENTRETIEN')) {
      const candidature = this.candidatures.find(c => Number(c?.id) === candidatureId);
      this.naviguerVers('candidatures');
      this.selectedOffreId = Number(candidature?.offreId ?? this.selectedOffreId ?? 0);
      this.selectedCandidatureForDetails = candidature || { id: candidatureId };
      this.showNotifPanel = false;
      if (this.selectedOffreId !== null) {
        this.loadCandidatures();
      }
      this.cdr.detectChanges();
    }
  }

  getNotifTitle(notification: any): string {
    switch (notification?.type) {
      case 'QUESTIONS_ENTRETIEN':
        return 'RÃ©ponse du candidat attendue';
      case 'REPONSE_ENTRETIEN':
        return 'RÃ©ponse du candidat reÃ§ue';
      case 'CANDIDATURE':
        return 'Nouvelle candidature';
      case 'OFFRE':
        return 'Offre';
      case 'STATUT':
        return 'Changement de statut';
      case 'EMAIL':
        return 'Email';
      case 'SYSTEME':
        return 'SystÃ¨me';
      default:
        return 'Notification';
    }
  }

  getNotifSummary(notification: any): string {
    const message = String(notification?.message || '').trim();
    if (notification?.type === 'QUESTIONS_ENTRETIEN') {
      return 'Le candidat doit rÃ©pondre aux questions dâ€™entretien.';
    }
    if (notification?.type === 'REPONSE_ENTRETIEN') {
      return 'Le candidat a rÃ©pondu. Cliquez pour voir le dÃ©tail.';
    }
    return message.length > 120 ? `${message.slice(0, 120)}â€¦` : message;
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
    if (diffMin < 1) return "Ã€ l'instant";
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
    if (this.selectedOffreId === null || this.selectedOffreId === undefined) return '';
    if (this.selectedOffreId === 0) return 'Toutes les offres';
    const offre = this.offres.find(o => o.id === this.selectedOffreId);
    return offre?.titre || '';
  }

  logout(): void {
    this.removeStorageItem('token');
    this.removeStorageItem('utilisateur');
    this.router.navigate(['/auth']);
  }

  naviguerVers(section: string): void {
    if (this.activeSection === section) return;
    this.sectionHistory.push(this.activeSection);
    this.activeSection = section;
    if (typeof window !== 'undefined' && (window as any).history && typeof (window as any).history.pushState === 'function') {
      try { window.history.pushState({ section }, '', window.location.href); } catch {}
    }
    this.cdr.detectChanges();
  }

  returnToLast(defaultSection: string = 'dashboard'): void {
    const previousSection = this.sectionHistory.pop();
    this.activeSection = previousSection || defaultSection;
    if (typeof window !== 'undefined' && (window as any).history && typeof (window as any).history.pushState === 'function') {
      try { window.history.pushState({ section: this.activeSection }, '', window.location.href); } catch {}
    }
    this.cdr.detectChanges();
  }

  @HostListener('window:popstate')
  onPopState(): void {
    const previousSection = this.sectionHistory.pop();
    if (!previousSection) return;
    this.activeSection = previousSection;
    if (typeof window !== 'undefined' && (window as any).history && typeof (window as any).history.pushState === 'function') {
      try { window.history.pushState({ section: this.activeSection }, '', window.location.href); } catch {}
    }
    this.cdr.detectChanges();
  }

  private seedSectionHistory(): void {
    this.sectionHistory = [this.activeSection];
    if (typeof window !== 'undefined' && (window as any).history && typeof (window as any).history.replaceState === 'function') {
      try { window.history.replaceState({ section: this.activeSection }, '', window.location.href); } catch {}
    }
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


