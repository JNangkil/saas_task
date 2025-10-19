import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize, take } from 'rxjs/operators';

import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  standalone: false,
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);

  protected readonly isSubmitting = signal(false);
  protected readonly backendError = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    companyName: ['', [Validators.required, Validators.maxLength(120)]],
    email: ['', [Validators.required, Validators.email]],
    password: [
      '',
      [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)
      ]
    ],
    passwordConfirmation: ['', [Validators.required]]
  });

  ngOnInit(): void {
    this.authService.ensureSession().pipe(take(1)).subscribe(user => {
      if (user.id) {
        this.router.navigateByUrl('/dashboard');
      }
    });
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

    const { name, companyName, email, password, passwordConfirmation } = this.form.getRawValue();

    this.isSubmitting.set(true);

    this.authService
      .register({
        name,
        companyName,
        email,
        password,
        passwordConfirmation,
        locale: 'en'
      })
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: () => {
          this.notifications.success('Workspace created successfully! Let’s finish onboarding.');
          this.router.navigateByUrl('/onboarding');
        },
        error: (error: HttpErrorResponse) => {
          const validationMessage = this.extractValidationMessage(error);
          this.backendError.set(validationMessage);
          this.notifications.error(validationMessage);
        }
      });
  }

  protected passwordsMatch(): boolean {
    const { password, passwordConfirmation } = this.form.getRawValue();
    return password === passwordConfirmation;
  }

  private extractValidationMessage(error: HttpErrorResponse): string {
    if (error.status === 422 && error.error?.errors) {
      const firstKey = Object.keys(error.error.errors)[0];
      if (firstKey) {
        return error.error.errors[firstKey][0];
      }
    }

    return error.error?.message ?? 'Unable to create your account at this time. Please try again.';
  }
}
