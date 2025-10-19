import { Component, DestroyRef, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { OnboardingStateService } from '../../services/onboarding-state.service';

@Component({
  standalone: false,
  selector: 'app-onboarding-layout',
  templateUrl: './onboarding-layout.component.html',
  styleUrls: ['./onboarding-layout.component.scss']
})
export class OnboardingLayoutComponent {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly state = inject(OnboardingStateService);
  protected readonly steps = this.state.steps;
  protected readonly activeIndex = signal(0);

  constructor() {
    this.syncActiveStep(this.router.url);

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(event => this.syncActiveStep(event.urlAfterRedirects));
  }

  protected isStepActive(index: number): boolean {
    return index === this.activeIndex();
  }

  protected isStepCompleted(index: number): boolean {
    return index < this.activeIndex();
  }

  private syncActiveStep(url: string): void {
    const sanitizedUrl = (url ?? '').split('?')[0];
    const segment = sanitizedUrl.split('/').filter(Boolean).pop() ?? '';
    const matchedIndex = this.steps.findIndex(step => step.route === segment);
    this.activeIndex.set(matchedIndex >= 0 ? matchedIndex : 0);
  }
}
