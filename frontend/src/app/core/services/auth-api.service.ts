import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { User } from '../../shared/models/user.model';
import { ApiService } from './api.service';

export interface AuthResponse {
  token: string;
  user: User;
}

interface UserEnvelope {
  user: User;
}

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  constructor(private readonly api: ApiService) {}

  login(email: string, password: string): Observable<AuthResponse> {
    return this.api.post<AuthResponse>('auth/login', { email, password });
  }

  register(payload: {
    name: string;
    companyName: string;
    email: string;
    password: string;
    passwordConfirmation: string;
    locale?: 'en' | 'es' | 'fr';
  }): Observable<AuthResponse> {
    return this.api.post<AuthResponse>('auth/register', {
      name: payload.name,
      company_name: payload.companyName,
      email: payload.email,
      password: payload.password,
      password_confirmation: payload.passwordConfirmation,
      locale: payload.locale,
    });
  }

  fetchCurrentUser(): Observable<User> {
    return this.api.get<UserEnvelope>('auth/me').pipe(map(response => response.user));
  }

  logout(): Observable<void> {
    return this.api.post<void>('auth/logout', {});
  }

  requestPasswordReset(email: string): Observable<{ message: string }> {
    return this.api.post<{ message: string }>('auth/password/forgot', { email });
  }

  resetPassword(payload: {
    email: string;
    token: string;
    password: string;
    passwordConfirmation: string;
  }): Observable<{ message: string }> {
    return this.api.post<{ message: string }>('auth/password/reset', {
      email: payload.email,
      token: payload.token,
      password: payload.password,
      password_confirmation: payload.passwordConfirmation,
    });
  }
}
