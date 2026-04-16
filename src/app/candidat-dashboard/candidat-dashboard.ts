import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';

const API = 'http://localhost:8083';

interface OffreTag { id: number; tagLibelle: string; obligatoire?: boolean; }

interface Offre {
  id: number; titre: string; typeContrat: string; localisation: string;
  salaire: number; niveauExperienceRequis: string; description: string; tags?: OffreTag[];
}

interface Formation {
  id?: number; typeDiplome: string; diplomeObtenu: string;
  etablissement: string; statut: string;
  periodeDebutMois?: string; periodeDebutAnnee?: string;
  periodeFinMois?: string; periodeFinAnnee?: string;
  pays?: string; mention?: string; description?: string;
}

interface Experience {
  id?: number; titre: string; entreprise: string; typeContrat: string; lieu: string;
  debutMois: string; debutAnnee: string; finMois: string; finAnnee: string;
  enCours: boolean; description: string;
}

interface Langue {
  id?: number; langue: string; niveau: string; certificat: string;
  score?: string;
}

// ✅ Interface Document
interface CandidatDocument {
  id?: number;
  fileName: string;
  nom?: string;
  documentType: string;
  type?: string;
  sizeBytes?: number;
  uploadedAt?: string;
  downloadUrl?: string;
}

@Component({
  selector: 'app-candidat-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, MatIconModule],
  templateUrl: './candidat-dashboard.html',
  styleUrls: ['./candidat-dashboard.scss']
})
export class CandidatDashboardComponent implements OnInit {

  activeSection = 'profil-cv';
  darkMode = false;
  showUserMenu = false;
  searchQuery = '';
  showPostulerModal = false;
  showOffreDetailsModal = false;
  selectedOffre: Offre | null = null;
  lettreMotivation = '';

  currentUser: any = null;
  offres: Offre[] = [];
  filteredOffres: Offre[] = [];
  candidatures: any[] = [];
  profilTags: any[] = [];
  allTags: any[] = [];

  formations: Formation[] = [];
  experiences: Experience[] = [];
  langues: Langue[] = [];

  // ✅ Documents comme objets (plus comme strings)
  cvDocuments: CandidatDocument[] = [];
  certificationDocuments: CandidatDocument[] = [];
  uploadInProgress = false;

  profileForm!: FormGroup;
  proInfoForm!: FormGroup;
  formationForm!: FormGroup;
  experienceForm!: FormGroup;
  langueForm!: FormGroup;

  selectedTagId: number | null = null;
  selectedNiveau = 'DEBUTANT';
  anneesPratique = 0;

  pointsForts = '';
  centresInteret = '';
  editPointsForts = false;
  editCentresInteret = false;

  sejours: Array<{ pays: string; dureeJours: number }> = [{ pays: '', dureeJours: 0 }];

  niveaux = ['DEBUTANT', 'INTERMEDIAIRE', 'EXPERT'];
  niveauxLangue = ['Débutant', 'Intermédiaire', 'Avancé', 'Courant'];

  mois = [
    { val: '01', label: 'Janvier' }, { val: '02', label: 'Février' },
    { val: '03', label: 'Mars' },    { val: '04', label: 'Avril' },
    { val: '05', label: 'Mai' },     { val: '06', label: 'Juin' },
    { val: '07', label: 'Juillet' }, { val: '08', label: 'Août' },
    { val: '09', label: 'Septembre' },{ val: '10', label: 'Octobre' },
    { val: '11', label: 'Novembre' }, { val: '12', label: 'Décembre' },
  ];

  annees: string[] = [];

  typesDiplome = [
    'Baccalauréat', 'Licence (Bac+3)', 'Master (Bac+5)', 'Doctorat (Bac+8)',
    'BTS / DUT', 'Certificat professionnel', 'Formation continue', 'Autre'
  ];

  typesContrat = ['CDI', 'CDD', 'Stage', 'Alternance', 'Freelance', 'Intérim'];

  paysListe = [
    'Tunisie', 'France', 'Algérie', 'Maroc', 'Allemagne', 'Belgique',
    'Canada', 'Espagne', 'Italie', 'Suisse', 'Royaume-Uni', 'Autre'
  ];

  languesListe = [
    'Arabe', 'Français', 'Anglais', 'Allemand', 'Espagnol',
    'Italien', 'Portugais', 'Turc', 'Chinois', 'Japonais', 'Autre'
  ];

  certificatsLangue = [
    '---------', 'TOEFL', 'TOEIC', 'IELTS', 'DELF', 'DALF', 'TCF', 'DELE', 'Goethe-Zertifikat', 'Autre'
  ];

  niveauxEtude = ['Bac', 'Bac + 1', 'Bac + 2', 'Bac + 3', 'Bac + 4', 'Bac + 5', 'Bac + 6', 'Bac + 7 et +'];

  situationsPro = [
    '---------', 'En poste', 'En recherche d\'emploi', 'En stage', 'Freelance', 'Sans emploi', 'Etudiant'
  ];

  secteurs = [
    'aéronautique / aviation / voyagiste',
    'agriculture / agro-alimentaire / environnement',
    'architecture / immobilier / BTP',
    'artisanat / textile / cuir',
    'automobile / moteurs / engins mécaniques',
    'banque / finance / assurances',
    'commerce / vente / distribution',
    'communication / médias / publicité',
    'culture / sport / loisirs',
    'droit / sciences politiques',
    'éducation / formation',
    'énergie / eau / électricité',
    'hôtellerie / restauration / tourisme',
    'industrie / production',
    'informatique / télécommunications',
    'logistique / transport',
    'marketing / e-commerce',
    'médecine / paramédical / santé',
    'ressources humaines',
    'sécurité / défense',
  ];

  selectedSecteurs: string[] = [];

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router
  ) {
    const currentYear = new Date().getFullYear();
    for (let y = currentYear; y >= 1970; y--) {
      this.annees.push(y.toString());
    }
  }

  ngOnInit(): void {
    const stored = this.getStorageItem('utilisateur');
    this.currentUser = stored ? JSON.parse(stored) : { id: 1, prenom: 'Demo', nom: 'Candidat', role: 'CANDIDAT' };
    this.loadProfile();
    this.loadOffres();
    this.loadCandidatures();
    this.loadProfilTags();
    this.loadAllTags();
    this.loadFormations();
    this.loadExperiences();
    this.loadLangues();
    this.loadDocuments(); // ✅ nouveau
    this.initForms();
  }

  initForms(): void {
    this.initProfileForm();
    this.initProInfoForm();
    this.initFormationForm();
    this.initExperienceForm();
    this.initLangueForm();
  }

  // ===== CHARGEMENTS =====

  loadProfile(): void {
    this.http.get<any>(`${API}/candidats/${this.currentUser.id}`).subscribe({
      next: (data) => {
        this.currentUser = { ...this.currentUser, ...data };
        this.pointsForts = data.pointsForts || '';
        this.centresInteret = data.centresInteret || '';
        this.initProfileForm();
        this.initProInfoForm();
      },
      error: () => this.initProfileForm()
    });
  }

  loadOffres(): void {
    this.http.get<Offre[]>(`${API}/offres`).subscribe({
      next: (data) => { this.offres = data; this.filteredOffres = [...data]; }
    });
  }

  loadCandidatures(): void {
    this.http.get<any[]>(`${API}/candidatures/candidat/${this.currentUser.id}`).subscribe({
      next: (data) => this.candidatures = data,
      error: () => this.candidatures = []
    });
  }

  loadProfilTags(): void {
    this.http.get<any[]>(`${API}/profil-tags/candidat/${this.currentUser.id}`).subscribe({
      next: (data) => this.profilTags = data,
      error: () => this.profilTags = []
    });
  }

  loadAllTags(): void {
    this.http.get<any[]>(`${API}/tags`).subscribe({
      next: (data) => this.allTags = data,
      error: () => this.allTags = []
    });
  }

  loadFormations(): void {
    this.http.get<Formation[]>(`${API}/candidats/${this.currentUser.id}/formations`).subscribe({
      next: (data) => this.formations = data,
      error: () => this.formations = []
    });
  }

  loadExperiences(): void {
    this.http.get<Experience[]>(`${API}/candidats/${this.currentUser.id}/experiences`).subscribe({
      next: (data) => this.experiences = data,
      error: () => this.experiences = []
    });
  }

  loadLangues(): void {
    this.http.get<Langue[]>(`${API}/candidats/${this.currentUser.id}/langues`).subscribe({
      next: (data) => this.langues = data,
      error: () => this.langues = []
    });
  }

  // ✅ Charger les documents depuis le backend
  loadDocuments(): void {
    this.http.get<CandidatDocument[]>(
      `${API}/candidats/${this.currentUser.id}/documents`
    ).subscribe({
      next: (data) => {
        const all = data || [];
        this.cvDocuments = all.filter(d =>
          (d.documentType || d.type || '').toUpperCase() === 'CV'
        );
        this.certificationDocuments = all.filter(d =>
          (d.documentType || d.type || '').toUpperCase() === 'CERTIFICATION'
        );
      },
      error: () => {
        this.cvDocuments = [];
        this.certificationDocuments = [];
      }
    });
  }

  // ===== FORM INITS =====

  initProfileForm(): void {
    this.profileForm = this.fb.group({
      nom:           [this.currentUser?.nom || ''],
      prenom:        [this.currentUser?.prenom || ''],
      genre:         [this.currentUser?.genre || ''],
      dateNaissance: [this.currentUser?.dateNaissance || ''],
      etatCivil:     [this.currentUser?.etatCivil || ''],
      adresse:       [this.currentUser?.adresse || ''],
      codePostal:    [this.currentUser?.codePostal || ''],
      pays:          [this.currentUser?.pays || 'Tunisie'],
      telephone:     [this.currentUser?.telephone || ''],
    });
  }

  initProInfoForm(): void {
    this.proInfoForm = this.fb.group({
      titreProfessionnel:      [this.currentUser?.titreProfessionnel || ''],
      niveauEtude:             [this.currentUser?.niveauEtude || 'Bac + 3'],
      situationProfessionnelle:[this.currentUser?.situationProfessionnelle || ''],
      disponibilite:           [this.currentUser?.disponibilite || ''],
    });
  }

  initFormationForm(): void {
    this.formationForm = this.fb.group({
      typeDiplome:   ['---------'],
      diplomeObtenu: [''],
      etablissement: [''],
      pays:          ['Tunisie'],
      statut:        [''],
    });
  }

  initExperienceForm(): void {
    this.experienceForm = this.fb.group({
      titre:      [''],
      entreprise: [''],
      typeContrat:['CDI'],
      lieu:       [''],
      debutMois:  ['---'],
      debutAnnee: ['---'],
      finMois:    ['---'],
      finAnnee:   ['---'],
      enCours:    [false],
      description:[''],
    });
  }

  initLangueForm(): void {
    this.langueForm = this.fb.group({
      langue:     ['---------'],
      niveau:     [''],
      certificat: ['---------'],
    });
    this.sejours = [{ pays: '', dureeJours: 0 }];
  }

  // ===== SAVE METHODS =====

  savePersonalInfo(): void {
    const v = this.profileForm.value;
    this.http.put(`${API}/candidats/${this.currentUser.id}`, v).subscribe({
      next: () => this.applyAndReturn(v),
      error: () => this.applyAndReturn(v)
    });
  }

  saveProfessionalInfo(): void {
    const v = this.proInfoForm.value;
    this.http.put(`${API}/candidats/${this.currentUser.id}`, v).subscribe({
      next: () => this.applyAndReturn(v),
      error: () => this.applyAndReturn(v)
    });
  }

  private applyAndReturn(v: any): void {
    this.currentUser = { ...this.currentUser, ...v };
    this.setStorageItem('utilisateur', JSON.stringify(this.currentUser));
    this.activeSection = 'profil-cv';
  }

  saveFormation(addAnother = false): void {
    const v = this.formationForm.value;
    this.http.post(`${API}/candidats/${this.currentUser.id}/formations`, v).subscribe({
      next: () => {
        this.loadFormations();
        addAnother ? this.initFormationForm() : (this.activeSection = 'profil-cv');
      },
      error: () => {
        this.formations = [...this.formations, { ...v, id: Date.now() }];
        if (!addAnother) this.activeSection = 'profil-cv';
        else this.initFormationForm();
      }
    });
  }

  saveExperience(addAnother = false): void {
    const v = this.experienceForm.value;
    this.http.post(`${API}/candidats/${this.currentUser.id}/experiences`, v).subscribe({
      next: () => {
        this.loadExperiences();
        addAnother ? this.initExperienceForm() : (this.activeSection = 'profil-cv');
      },
      error: () => {
        this.experiences = [...this.experiences, { ...v, id: Date.now() }];
        if (!addAnother) this.activeSection = 'profil-cv';
        else this.initExperienceForm();
      }
    });
  }

  saveLangue(addAnother = false): void {
    const v = this.langueForm.value;
    this.http.post(`${API}/candidats/${this.currentUser.id}/langues`, v).subscribe({
      next: () => {
        this.loadLangues();
        addAnother ? this.initLangueForm() : (this.activeSection = 'profil-cv');
      },
      error: () => {
        this.langues = [...this.langues, { ...v, id: Date.now() }];
        if (!addAnother) this.activeSection = 'profil-cv';
        else this.initLangueForm();
      }
    });
  }

  // ✅ Upload document vers le backend
  onDocumentSelected(event: Event, type: 'cv' | 'certification'): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const docType = type === 'cv' ? 'CV' : 'CERTIFICATION';

    this.uploadInProgress = true;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', docType);

    this.http.post<CandidatDocument>(
      `${API}/candidats/${this.currentUser.id}/documents`,
      formData
    ).subscribe({
      next: () => {
        this.uploadInProgress = false;
        this.loadDocuments(); // ✅ recharge depuis backend
      },
      error: () => {
        // Fallback local si backend indisponible
        this.uploadInProgress = false;
        const localDoc: CandidatDocument = {
          fileName: file.name,
          documentType: docType,
          sizeBytes: file.size
        };
        if (type === 'cv') this.cvDocuments.push(localDoc);
        else this.certificationDocuments.push(localDoc);
      }
    });

    input.value = '';
  }

  // ✅ Supprimer document du backend
  removeDocument(type: 'cv' | 'certification', index: number): void {
    const doc = type === 'cv'
      ? this.cvDocuments[index]
      : this.certificationDocuments[index];

    if (!doc.id) {
      // Document local seulement
      if (type === 'cv') this.cvDocuments.splice(index, 1);
      else this.certificationDocuments.splice(index, 1);
      return;
    }

    this.http.delete(
      `${API}/candidats/${this.currentUser.id}/documents/${doc.id}`
    ).subscribe({
      next: () => this.loadDocuments(),
      error: () => {
        if (type === 'cv') this.cvDocuments.splice(index, 1);
        else this.certificationDocuments.splice(index, 1);
      }
    });
  }

  savePointsForts(): void {
    this.http.put(`${API}/candidats/${this.currentUser.id}`, { pointsForts: this.pointsForts }).subscribe({
      next: () => { this.currentUser.pointsForts = this.pointsForts; this.editPointsForts = false; },
      error: () => { this.currentUser.pointsForts = this.pointsForts; this.editPointsForts = false; }
    });
  }

  saveCentresInteret(): void {
    this.http.put(`${API}/candidats/${this.currentUser.id}`, { centresInteret: this.centresInteret }).subscribe({
      next: () => { this.currentUser.centresInteret = this.centresInteret; this.editCentresInteret = false; },
      error: () => { this.currentUser.centresInteret = this.centresInteret; this.editCentresInteret = false; }
    });
  }

  deleteFormation(id?: number): void {
    if (!id) return;
    this.http.delete(`${API}/candidats/${this.currentUser.id}/formations/${id}`).subscribe({
      next: () => this.loadFormations(),
      error: () => this.formations = this.formations.filter(f => f.id !== id)
    });
  }

  deleteExperience(id?: number): void {
    if (!id) return;
    this.http.delete(`${API}/candidats/${this.currentUser.id}/experiences/${id}`).subscribe({
      next: () => this.loadExperiences(),
      error: () => this.experiences = this.experiences.filter(e => e.id !== id)
    });
  }

  deleteLangue(id?: number): void {
    if (!id) return;
    this.http.delete(`${API}/candidats/${this.currentUser.id}/langues/${id}`).subscribe({
      next: () => this.loadLangues(),
      error: () => this.langues = this.langues.filter(l => l.id !== id)
    });
  }

  // ===== TAGS =====

  ajouterTag(): void {
    if (!this.selectedTagId) return;
    const payload = {
      candidatId: this.currentUser.id,
      tagId: this.selectedTagId,
      niveau: this.selectedNiveau,
      anneesPratique: this.anneesPratique
    };
    this.http.post(`${API}/profil-tags`, payload).subscribe({
      next: () => { this.loadProfilTags(); this.selectedTagId = null; this.anneesPratique = 0; }
    });
  }

  supprimerTag(id: number): void {
    this.http.delete(`${API}/profil-tags/${id}`).subscribe({
      next: () => this.loadProfilTags()
    });
  }

  // ===== OFFRES =====

  filterOffres(): void {
    const q = this.searchQuery.toLowerCase();
    this.filteredOffres = this.offres.filter(o =>
      o.titre.toLowerCase().includes(q) || o.localisation.toLowerCase().includes(q)
    );
  }

  ouvrirPostuler(offre: Offre): void {
    this.selectedOffre = offre;
    this.showPostulerModal = true;
    this.lettreMotivation = '';
  }

  ouvrirDetailsOffre(offre: Offre): void {
    this.selectedOffre = offre;
    this.showOffreDetailsModal = true;
  }

  fermerDetailsOffre(): void {
    this.showOffreDetailsModal = false;
  }

  postulerDepuisDetails(): void {
    if (!this.selectedOffre) return;
    this.showOffreDetailsModal = false;
    this.ouvrirPostuler(this.selectedOffre);
  }

  postuler(): void {
    if (!this.selectedOffre) return;
    const payload = {
      candidatId: this.currentUser.id,
      offreId: this.selectedOffre.id,
      lettreMotivation: this.lettreMotivation
    };
    this.http.post<any>(`${API}/candidatures`, payload).subscribe({
      next: (result) => {
        this.showPostulerModal = false;
        this.loadCandidatures();
        alert(`Candidature envoyée ! Score : ${result.scoreTotal?.toFixed(1)}%`);
      },
      error: (err) => alert(err?.error?.message || 'Erreur lors de la candidature')
    });
  }

  // ===== SECTEURS =====

  addSejour(): void { this.sejours.push({ pays: '', dureeJours: 0 }); }

  toggleSecteur(secteur: string): void {
    const idx = this.selectedSecteurs.indexOf(secteur);
    idx >= 0 ? this.selectedSecteurs.splice(idx, 1) : this.selectedSecteurs.push(secteur);
  }

  hasSecteur(secteur: string): boolean { return this.selectedSecteurs.includes(secteur); }

  // ===== PROFILE COMPLETION =====

  hasPersonalInfo(): boolean {
    return !!(this.currentUser?.nom && this.currentUser?.prenom && this.currentUser?.telephone);
  }

  hasProfessionalInfo(): boolean {
    return !!(this.currentUser?.titreProfessionnel || this.currentUser?.situationProfessionnelle);
  }

  getProfileCompletion(): number {
    let pct = 0;
    if (this.hasPersonalInfo()) pct += 15;
    if (this.hasProfessionalInfo()) pct += 15;
    if (this.experiences.length > 0) pct += 25;
    if (this.formations.length > 0) pct += 15;
    if (this.profilTags.length > 0) pct += 10;
    if (this.langues.length > 0) pct += 10;
    return pct;
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

  getNiveauColor(niveau: string): string {
    const map: any = {
      'DEBUTANT': '#6366f1',
      'INTERMEDIAIRE': '#f59e0b',
      'EXPERT': '#22c55e'
    };
    return map[niveau] || '#6366f1';
  }

  getNiveauProgress(niveau: string): number {
    const n = (niveau || '').toUpperCase();
    if (n === 'EXPERT') return 100;
    if (n === 'INTERMEDIAIRE' || n === 'INTERMÉDIAIRE') return 50;
    if (n === 'AVANCE' || n === 'AVANCÉ') return 75;
    if (n === 'DEBUTANT' || n === 'DÉBUTANT') return 25;
    return 40;
  }

  getDocumentName(doc: CandidatDocument): string {
    return doc.fileName || doc.nom || 'Document';
  }

  getDocumentSize(doc: CandidatDocument): string {
    if (!doc.sizeBytes) return '';
    const kb = doc.sizeBytes / 1024;
    return kb < 1024 ? `${Math.round(kb)} Ko` : `${(kb / 1024).toFixed(1)} Mo`;
  }

  toggleUserMenu(event: Event): void {
    event.stopPropagation();
    this.showUserMenu = !this.showUserMenu;
  }

  closeUserMenu(): void { this.showUserMenu = false; }

  goToFromUserMenu(section: string): void {
    this.activeSection = section;
    this.closeUserMenu();
  }

  goToSettings(): void {
    this.activeSection = 'personal-info';
    this.initProfileForm();
    this.closeUserMenu();
  }

  logout(): void {
    this.closeUserMenu();
    this.removeStorageItem('token');
    this.removeStorageItem('utilisateur');
    this.router.navigate(['/auth']);
  }

  private getStorageItem(key: string): string | null {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(key);
  }

  private setStorageItem(key: string, value: string): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(key, value);
  }

  private removeStorageItem(key: string): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(key);
  }

  descriptionLength(): number {
    return this.formationForm?.get('description')?.value?.length || 0;
  }
}