import { Utilisateur } from './utilisateur';

export interface LoginResponse {
  accessToken: string;
  utilisateur: Utilisateur;
}