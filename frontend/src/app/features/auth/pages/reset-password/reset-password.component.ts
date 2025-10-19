import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs/operators';

import { AuthApiService } from '../../../../core/services/auth-api.service';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  standalone: false,
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss']
})
export class ResetPasswordComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authApi = inject(AuthApiService);
  private readonly notifications = inject(NotificationService);

  protected readonly isSubmitting = signal(false);
  protected readonly backendError = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    token: ['', [Validators.required]],
    password: [
      '',
      [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)
      ]
    ],
    passwordConfirmation: ['', Validators.required]
  });

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    const email = this.route.snapshot.queryParamMap.get('email');

    if (token) {
      this.form.get('token')?.setValue(token);
    }

    if (email) {
      this.form.get('email')?.setValue(email);
    }
  }

  protected submit(): void {
    this.backendError.set(null);

    if (this.form.invalid || !this.passwordsMatch()) {
      this.form.markAllAsTouched();
      if (!this.passwordsMatch()) {
        this.backendError.set('Passwords must match.');
      }
      return;
    }

    const { email, token, password, passwordConfirmation } = this.form.getRawValue();

    this.isSubmitting.set(true);

    this.authApi
      .resetPassword({ email, token, password, passwordConfirmation })
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: response => {
          this.notifications.success(response.message || 'Password updated successfully.');
          this.router.navigateByUrl('/auth/login');
        },
        error: (error: HttpErrorResponse) => {
          const message = error.error?.message ?? 'The reset link may have expired. Request a new one.';
          this.backendError.set(message);
          this.notifications.error(message);
        }
      });
  }

  private passwordsMatch(): boolean {
    const { password, passwordConfirmation } = this.form.getRawValue();
    return password === passwordConfirmation;
  }
}
