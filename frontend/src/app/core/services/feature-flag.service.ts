import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type FeatureFlag =
  | 'reports-beta'
  | 'billing-integration'
  | 'workspace-analytics';

@Injectable({ providedIn: 'root' })
export class FeatureFlagService {
  private readonly flags$ = new BehaviorSubject<Record<FeatureFlag, boolean>>({
    'reports-beta': true,
    'billing-integration': false,
    'workspace-analytics': false
  });

  getFlags(): Observable<Record<FeatureFlag, boolean>> {
    return this.flags$.asObservable();
  }

  isEnabled(flag: FeatureFlag): boolean {
    return this.flags$.value[flag];
  }

  setFlag(flag: FeatureFlag, enabled: boolean): void {
    this.flags$.next({ ...this.flags$.value, [flag]: enabled });
  }
}
