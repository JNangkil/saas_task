import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { OnboardingStateService } from '../../services/onboarding-state.service';

@Component({
  standalone: false,
  selector: 'app-onboarding-company-details',
  templateUrl: './company-details.component.html',
  styleUrls: ['./company-details.component.scss']
})
export class CompanyDetailsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly state = inject(OnboardingStateService);

  protected readonly form = this.fb.nonNullable.group({
    companyName: ['', [Validators.required, Validators.maxLength(120)]],
    teamSize: this.fb.nonNullable.control<'1-5' | '6-15' | '16-50' | '51+'>('1-5', {
      validators: [Validators.required]
    }),
    workStyle: this.fb.nonNullable.control<'remote' | 'hybrid' | 'in-office'>('hybrid', {
      validators: [Validators.required]
    })
  });

  protected readonly teamSizeOptions: Array<{ value: '1-5' | '6-15' | '16-50' | '51+'; label: string }> = [
    { value: '1-5', label: '1–5 people' },
    { value: '6-15', label: '6–15 people' },
    { value: '16-50', label: '16–50 people' },
    { value: '51+', label: '51+ people' }
  ];

  protected readonly workStyleOptions: Array<{ value: 'remote' | 'hybrid' | 'in-office'; label: string }> = [
    { value: 'remote', label: 'Remote' },
    { value: 'hybrid', label: 'Hybrid' },
    { value: 'in-office', label: 'In office' }
  ];

  ngOnInit(): void {
    const existing = this.state.companyDetails();
    this.form.patchValue(existing);
  }

  protected continue(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.state.updateCompanyDetails(this.form.getRawValue());
    this.router.navigate(['../invite'], { relativeTo: this.route });
  }

  protected back(): void {
    this.router.navigate(['../welcome'], { relativeTo: this.route });
  }
}
