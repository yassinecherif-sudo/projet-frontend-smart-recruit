// home/home.ts
import { Component, OnInit, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { ChangeDetectorRef } from '@angular/core';


const API = 'http://localhost:8083';


interface RawOffreTag {
  tagLibelle?: string;
  libelle?: string;
}

interface RawOffre {
  id?: number;
  titre?: string;
  statut?: string;
  typeContrat?: string;
  localisation?: string;
  salaire?: number | string;
  scoreMinimum?: number;
  tags?: RawOffreTag[];
  recruteur?: {
    nomEntreprise?: string;
    nom?: string;
    prenom?: string;
  };
}

interface HomeOffre {
  id: number;
  titre: string;
  entreprise: string;
  localisation: string;
  typeContrat: string;
  salaire: string;
  score: number;
  tags: string[];
  urgent: boolean;
  logo: string;
  logoColor: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
  ],
  templateUrl: './home.html',
  styleUrls: ['./home.scss']
})
export class Home implements OnInit {

  stats = [
    { value: '14K+', label: 'Offres actives' },
    { value: '9K+',  label: 'Candidats inscrits' },
    { value: '85%',  label: 'Taux de matching' },
    { value: '450+', label: 'Entreprises partenaires' },
  ];

  featuredOffres: HomeOffre[] = [];

  howItWorks = [
    { step: '01', icon: 'person_add',   title: 'Créez votre profil',       desc: 'Remplissez vos compétences via notre Skills Matrix intelligent.' },
    { step: '02', icon: 'psychology',   title: 'IA analyse votre profil',  desc: 'Notre moteur IA calcule votre score de compatibilité en temps réel.' },
    { step: '03', icon: 'work',         title: 'Postulez en 1 clic',       desc: 'Candidatez aux offres qui vous correspondent le mieux.' },
    { step: '04', icon: 'celebration',  title: 'Décrochez le poste',       desc: 'Suivez votre pipeline et recevez des notifications en temps réel.' },
  ];

  isLoadingOffres = true;
  offresError = '';
  private platformId = inject(PLATFORM_ID);

  constructor(
    private router: Router,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadFeaturedOffres();
  }

  goToAuth(tab: 'login' | 'register') {
    this.router.navigate(['/auth'], { queryParams: { tab } });
  }

  goToRoleRegister(role: 'CANDIDAT' | 'RECRUTEUR') {
    const target = role === 'CANDIDAT' ? '/register-candidat' : '/register-recruteur';
    this.router.navigate([target]);
  }

  scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }

  private loadFeaturedOffres(): void {
    if (!isPlatformBrowser(this.platformId)) {
      this.isLoadingOffres = false;
      return;
    }

    this.isLoadingOffres = true;
    this.offresError = '';

    this.http.get<RawOffre[]>(`${API}/offres`).subscribe({
      next: (offres) => {
        const openOffres = (offres || []).filter(offre => !offre.statut || offre.statut === 'OUVERTE');
        const mapped = openOffres.map((offre, index) => this.mapOffreForHome(offre, index));
        this.featuredOffres = mapped.filter(o => !!o.titre).slice(0, 6);
        this.isLoadingOffres = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.featuredOffres = [];
        this.isLoadingOffres = false;
        this.offresError = 'Impossible de charger les offres pour le moment.';
       
      }
    });
  }

  private mapOffreForHome(offre: RawOffre, index: number): HomeOffre {
    const logoColor = this.getOffreColor(offre.typeContrat, index);
    const entreprise = this.getEntrepriseName(offre);
    const titre = (offre.titre || '').trim();
    const logoSource = entreprise || titre || 'S';

    return {
      id: Number(offre.id || index + 1),
      titre,
      entreprise,
      localisation: offre.localisation || 'Localisation non précisée',
      typeContrat: offre.typeContrat || 'Type non précisé',
      salaire: this.formatSalaire(offre.salaire),
      score: this.buildScore(offre.scoreMinimum),
      tags: this.mapTags(offre.tags),
      urgent: false,
      logo: logoSource[0].toUpperCase(),
      logoColor,
    };
  }

  private getEntrepriseName(offre: RawOffre): string {
    if (offre.recruteur?.nomEntreprise) {
      return offre.recruteur.nomEntreprise;
    }

    const nom = offre.recruteur?.nom || '';
    const prenom = offre.recruteur?.prenom || '';
    const fullName = `${prenom} ${nom}`.trim();
    return fullName || 'Entreprise';
  }

  private mapTags(tags?: RawOffreTag[]): string[] {
    const values = (tags || []).map(tag => tag.tagLibelle || tag.libelle || '').filter(Boolean);
    return values.slice(0, 4);
  }

  private buildScore(scoreMinimum?: number): number {
    if (typeof scoreMinimum === 'number') {
      return Math.max(50, Math.min(99, Math.round(scoreMinimum)));
    }

    return 80;
  }

  private formatSalaire(salaire?: number | string): string {
    if (typeof salaire === 'number' && !Number.isNaN(salaire)) {
      return `${salaire.toLocaleString('fr-FR')} TND`;
    }

    if (typeof salaire === 'string' && salaire.trim()) {
      return salaire;
    }

    return 'Salaire à discuter';
  }

  private getOffreColor(typeContrat?: string, index = 0): string {
    const palette = ['#6366f1', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ec4899'];
    const contract = (typeContrat || '').toUpperCase();

    if (contract === 'CDI') return '#6366f1';
    if (contract === 'CDD') return '#3b82f6';
    if (contract === 'STAGE') return '#10b981';
    if (contract === 'FREELANCE') return '#8b5cf6';

    return palette[index % palette.length];
  }
}