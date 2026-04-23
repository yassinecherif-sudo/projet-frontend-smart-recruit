import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { LoginRequest } from '../models/login-request';
import { LoginResponse } from '../models/login-response';

@Injectable({
  providedIn: 'root',
})
export class Auth {

  // ✅ URL correcte vers Spring Boot
  private apiUrl = 'http://localhost:8083/users';
  private platformId = inject(PLATFORM_ID);

  constructor(private http: HttpClient) {}

  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  login(data: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, data).pipe(
      tap((response) => {
        if (!this.isBrowser()) return;
        localStorage.setItem('token', response.accessToken);
        localStorage.setItem('utilisateur', JSON.stringify(response.utilisateur));
      })
    );
  }

  logout(): void {
    if (!this.isBrowser()) return;
    localStorage.removeItem('token');
    localStorage.removeItem('utilisateur');
  }

  getToken(): string | null {
    if (!this.isBrowser()) return null;
    return localStorage.getItem('token');
  }

  getUtilisateur(): any {
    if (!this.isBrowser()) return null;
    const user = localStorage.getItem('utilisateur');
    return user ? JSON.parse(user) : null;
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  sendResetCode(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/resetPassword`, { email }, { responseType: 'text' });
  }

  validateCode(email: string, code: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/validate-code`, { email, code }, { responseType: 'text' });
  }

  changePassword(email: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/changePassword`, { email, newPassword }, { responseType: 'text' });
  }
}