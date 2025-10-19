import { Injectable } from '@angular/core';

const STORAGE_KEY = 'taskflow.auth.token';

@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  getAccessToken(): string | null {
    return localStorage.getItem(STORAGE_KEY);
  }

  setAccessToken(token: string): void {
    localStorage.setItem(STORAGE_KEY, token);
  }

  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
  }
}
