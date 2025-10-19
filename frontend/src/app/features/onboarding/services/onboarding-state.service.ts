import { Injectable, computed, signal } from '@angular/core';

import {
  CompanyDetailsPayload,
  OnboardingPlan
} from '../../../core/services/onboarding-api.service';

export interface OnboardingStep {
  key: 'welcome' | 'company' | 'invite' | 'plan';
  label: string;
  description: string;
  route: string;
}

@Injectable()
export class OnboardingStateService {
  private readonly companyDetailsSignal = signal<CompanyDetailsPayload>({
    companyName: '',
    teamSize: '1-5',
    workStyle: 'hybrid'
  });
  private readonly invitesSignal = signal<string[]>([]);
  private readonly planSignal = signal<OnboardingPlan | null>(null);

  readonly steps: OnboardingStep[] = [
    {
      key: 'welcome',
      label: 'Welcome',
      description: 'Kick off your TaskFlow workspace',
      route: 'welcome'
    },
    {
      key: 'company',
      label: 'Company details',
      description: 'Tell us about your team',
      route: 'company'
    },
    {
      key: 'invite',
      label: 'Invite teammates',
      description: 'Bring collaborators into the workspace',
      route: 'invite'
    },
    {
      key: 'plan',
      label: 'Select a plan',
      description: 'Choose the right fit for your team',
      route: 'plan'
    }
  ];

  readonly companyDetails = computed(() => this.companyDetailsSignal());
  readonly invites = computed(() => this.invitesSignal());
  readonly selectedPlan = computed(() => this.planSignal());

  updateCompanyDetails(details: CompanyDetailsPayload): void {
    this.companyDetailsSignal.set(details);
  }

  updateInvites(invites: string[]): void {
    this.invitesSignal.set(invites);
  }

  updateSelectedPlan(plan: OnboardingPlan): void {
    this.planSignal.set(plan);
  }
}
