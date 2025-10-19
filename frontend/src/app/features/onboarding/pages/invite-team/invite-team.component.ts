import { Component, OnInit, inject } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormControl,
  ValidationErrors,
  ValidatorFn
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { OnboardingStateService } from '../../services/onboarding-state.service';

@Component({
  standalone: false,
  selector: 'app-onboarding-invite-team',
  templateUrl: './invite-team.component.html',
  styleUrls: ['./invite-team.component.scss']
})
export class InviteTeamComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly state = inject(OnboardingStateService);

  protected readonly invites = this.fb.array<FormControl<string>>([]);
  protected readonly form = this.fb.group({
    invites: this.invites
  });

  private readonly optionalEmailValidator: ValidatorFn = (
    control: AbstractControl<string, string>
  ): ValidationErrors | null => {
    const value = control.value?.trim() ?? '';
    if (!value) {
      return null;
    }

    const emailPattern =
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

    return emailPattern.test(value) ? null : { email: true };
  };

  ngOnInit(): void {
    const existingInvites = this.state.invites();
    if (existingInvites.length) {
      existingInvites.forEach(email => this.invites.push(this.createInviteControl(email)));
    } else {
      Array.from({ length: 3 }).forEach(() => this.invites.push(this.createInviteControl()));
    }
  }

  protected addInvite(): void {
    this.invites.push(this.createInviteControl());
  }

  protected removeInvite(index: number): void {
    if (this.invites.length === 1) {
      this.invites.at(0).setValue('');
      return;
    }

    this.invites.removeAt(index);
  }

  protected continue(): void {
    const invalidControl = this.invites.controls.find(control => control.invalid);
    if (invalidControl) {
      this.invites.controls.forEach(control => control.markAsTouched());
      return;
    }

    const emails = this.invites.controls
      .map(control => control.value.trim())
      .filter(value => Boolean(value));

    this.state.updateInvites(emails);
    this.router.navigate(['../plan'], { relativeTo: this.route });
  }

  protected skip(): void {
    this.state.updateInvites([]);
    this.router.navigate(['../plan'], { relativeTo: this.route });
  }

  protected back(): void {
    this.router.navigate(['../company'], { relativeTo: this.route });
  }

  protected trackInvite(index: number, _control: FormControl<string>): number {
    return index;
  }

  private createInviteControl(value = ''): FormControl<string> {
    return this.fb.control(value, {
      nonNullable: true,
      validators: [this.optionalEmailValidator]
    });
  }
}
