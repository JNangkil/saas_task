import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { User } from '../../shared/models/user.model';
import { ApiService } from './api.service';

export type OnboardingPlan = 'starter' | 'growth' | 'scale';
export type WorkStyle = 'remote' | 'hybrid' | 'in-office';

export interface CompanyDetailsPayload {
  companyName: string;
  teamSize: '1-5' | '6-15' | '16-50' | '51+';
  workStyle: WorkStyle;
}

export interface CompleteOnboardingPayload {
  company: CompanyDetailsPayload;
  invites: string[];
  plan: OnboardingPlan;
}

interface OnboardingResponse {
  user: User;
}

@Injectable({ providedIn: 'root' })
export class OnboardingApiService {
  constructor(private readonly api: ApiService) {}

  completeOnboarding(payload: CompleteOnboardingPayload): Observable<User> {
    return this.api
      .post<OnboardingResponse>('onboarding/complete', {
        company_name: payload.company.companyName,
        team_size: payload.company.teamSize,
        work_style: payload.company.workStyle,
        invites: payload.invites,
        plan: payload.plan
      })
      .pipe(map(response => response.user));
  }
}
