import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, defer, of } from 'rxjs';
import { catchError, finalize, map, shareReplay, tap } from 'rxjs/operators';

import { User, UserRole } from '../../shared/models/user.model';
import { AuthApiService, AuthResponse } from './auth-api.service';
import {
  CompleteOnboardingPayload,
  OnboardingApiService
} from './onboarding-api.service';
import { TokenStorageService } from './token-storage.service';

const ANONYMOUS_USER: User = {
  id: '',
  email: '',
  displayName: '',
  roles: [],
  onboardingCompleted: false,
  companyName: null,
  locale: 'en'
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly user$ = new BehaviorSubject<User>(ANONYMOUS_USER);
  private hasBootstrapped = false;
  private bootstrap$?: Observable<User>;

  constructor(
    private readonly authApi: AuthApiService,
    private readonly tokenStorage: TokenStorageService,
    private readonly onboardingApi: OnboardingApiService
  ) {}

  ensureSession(): Observable<User> {
    if (this.hasBootstrapped) {
      return of(this.user$.value);
    }

    if (!this.bootstrap$) {
      this.bootstrap$ = defer(() => this.bootstrapFromStoredToken()).pipe(
        finalize(() => {
          this.hasBootstrapped = true;
          this.bootstrap$ = undefined;
        }),
        shareReplay({ bufferSize: 1, refCount: false })
      );
    }

    return this.bootstrap$;
  }

  login(email: string, password: string): Observable<User> {
    return this.authApi.login(email, password).pipe(
      tap(response => this.persistSession(response)),
      map(response => response.user)
    );
  }

  register(payload: {
    name: string;
    companyName: string;
    email: string;
    password: string;
    passwordConfirmation: string;
    locale?: 'en' | 'es' | 'fr';
  }): Observable<User> {
    return this.authApi.register(payload).pipe(
      tap(response => this.persistSession(response)),
      map(response => response.user)
    );
  }

  logout(): Observable<void> {
    return this.authApi.logout().pipe(
      catchError(() => of(undefined)),
      tap(() => this.clearSession()),
      map(() => void 0)
    );
  }

  isAuthenticated(): Observable<boolean> {
    return this.user$.pipe(map(user => Boolean(user.id)));
  }

  hasCompletedOnboarding(): Observable<boolean> {
    return this.user$.pipe(map(user => user.onboardingCompleted));
  }

  hasRole(role: UserRole): boolean {
    const currentUser = this.user$.value;
    return currentUser.roles.includes(role);
  }

  currentUser(): Observable<User> {
    return this.user$.asObservable();
  }

  private bootstrapFromStoredToken(): Observable<User> {
    const token = this.tokenStorage.getAccessToken();

    if (!token) {
      this.user$.next(ANONYMOUS_USER);
      return of(ANONYMOUS_USER);
    }

    return this.authApi.fetchCurrentUser().pipe(
      tap(user => this.user$.next(user)),
      catchError(() => {
        this.clearSession();
        return of(ANONYMOUS_USER);
      })
    );
  }

  completeOnboarding(payload: CompleteOnboardingPayload): Observable<User> {
    return this.onboardingApi.completeOnboarding(payload).pipe(
      tap(user => this.user$.next(user))
    );
  }

  private persistSession(response: AuthResponse): void {
    this.tokenStorage.setAccessToken(response.token);
    this.user$.next(response.user);
    this.hasBootstrapped = true;
  }

  private clearSession(): void {
    this.tokenStorage.clear();
    this.user$.next(ANONYMOUS_USER);
    this.hasBootstrapped = true;
  }
}
