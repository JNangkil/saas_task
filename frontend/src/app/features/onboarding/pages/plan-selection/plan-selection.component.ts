import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { AuthService } from '../../../../core/services/auth.service';
import {
  OnboardingPlan
} from '../../../../core/services/onboarding-api.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { OnboardingStateService } from '../../services/onboarding-state.service';

interface PlanOption {
  id: OnboardingPlan;
  name: string;
  price: string;
  priceDetail: string;
  description: string;
  features: string[];
}

@Component({
  standalone: false,
  selector: 'app-onboarding-plan-selection',
  templateUrl: './plan-selection.component.html',
  styleUrls: ['./plan-selection.component.scss']
})
export class PlanSelectionComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly notifications = inject(NotificationService);
  protected readonly state = inject(OnboardingStateService);

  protected readonly plans: PlanOption[] = [
    {
      id: 'starter',
      name: 'Starter',
      price: '$0',
      priceDetail: 'per month',
      description: 'For new teams getting organized.',
      features: ['Unlimited projects', 'Task list & board view', 'Basic dashboards']
    },
    {
      id: 'growth',
      name: 'Growth',
      price: '$12',
      priceDetail: 'per user / month',
      description: 'For scaling teams collaborating across projects.',
      features: ['Advanced project reports', 'Calendar view', 'Team workload insights']
    },
    {
      id: 'scale',
      name: 'Scale',
      price: '$22',
      priceDetail: 'per user / month',
      description: 'For established organizations needing governance.',
      features: ['Advanced permissions', 'Audit logs', 'Priority support']
    }
  ];

  protected readonly selectedPlan = signal<OnboardingPlan | null>(null);
  protected readonly isSubmitting = signal(false);
  protected readonly hasTriedSubmit = signal(false);

  ngOnInit(): void {
    const existingPlan = this.state.selectedPlan();
    if (existingPlan) {
      this.selectedPlan.set(existingPlan);
    }
  }

  protected choosePlan(plan: OnboardingPlan): void {
    this.selectedPlan.set(plan);
  }

  protected isSelected(plan: OnboardingPlan): boolean {
    return this.selectedPlan() === plan;
  }

  protected back(): void {
    this.router.navigate(['../invite'], { relativeTo: this.route });
  }

  protected complete(): void {
    this.hasTriedSubmit.set(true);

    const plan = this.selectedPlan();
    if (!plan) {
      return;
    }

    const company = this.state.companyDetails();
    if (!company.companyName) {
      this.notifications.error('Please provide your company details before completing onboarding.');
      this.router.navigate(['../company'], { relativeTo: this.route });
      return;
    }

    this.state.updateSelectedPlan(plan);

    const invites = this.state.invites();

    this.isSubmitting.set(true);
    this.authService
      .completeOnboarding({
        company,
        invites,
        plan
      })
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: () => {
          this.notifications.success('Onboarding complete! Welcome to your TaskFlow workspace.');
          this.router.navigateByUrl('/dashboard');
        },
        error: () => {
          this.notifications.error('Unable to complete onboarding right now. Please try again.');
        }
      });
  }
}
