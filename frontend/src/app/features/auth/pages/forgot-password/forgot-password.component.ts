import { Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs/operators';

import { AuthApiService } from '../../../../core/services/auth-api.service';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  standalone: false,
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss']
})
export class ForgotPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authApi = inject(AuthApiService);
  private readonly notifications = inject(NotificationService);

  protected readonly isSubmitting = signal(false);
  protected readonly emailSent = signal(false);
  protected readonly backendError = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]]
  });

  protected submit(): void {
    this.backendError.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email } = this.form.getRawValue();

    this.isSubmitting.set(true);

    this.authApi
      .requestPasswordReset(email)
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: response => {
          this.emailSent.set(true);
          this.notifications.info(response.message || 'Check your inbox for a reset link.');
        },
        error: (error: HttpErrorResponse) => {
          const message = error.error?.message ?? 'We could not process that email address.';
          this.backendError.set(message);
          this.notifications.error(message);
        }
      });
  }
}
