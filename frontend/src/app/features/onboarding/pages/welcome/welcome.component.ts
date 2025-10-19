import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  standalone: false,
  selector: 'app-onboarding-welcome',
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.scss']
})
export class WelcomeComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected continue(): void {
    this.router.navigate(['../company'], { relativeTo: this.route });
  }
}
