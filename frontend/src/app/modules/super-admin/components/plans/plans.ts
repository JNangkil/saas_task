import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SuperAdminService, Plan } from '../../../../services/super-admin.service';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-plans',
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatTooltipModule,
    MatMenuModule
  ],
  templateUrl: './plans.html',
  styleUrl: './plans.css',
})
export class Plans implements OnInit {
  plans: Plan[] = [];
  loading = true;
  error: string | null = null;

  constructor(
    private superAdminService: SuperAdminService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.loadPlans();
  }

  loadPlans() {
    this.loading = true;
    this.error = null;

    this.superAdminService.getPlans().subscribe({
      next: (plans) => {
        this.plans = plans;
        this.loading = false;
      },
      error: (error) => {
        this.error = 'Failed to load plans. Please try again.';
        this.loading = false;
        console.error('Error loading plans:', error);
      }
    });
  }

  createPlan() {
    // TODO: Implement create plan dialog
    this.snackBar.open('Create plan feature coming soon', 'Close', {
      duration: 3000
    });
  }

  editPlan(plan: Plan) {
    // TODO: Implement edit plan dialog
    this.snackBar.open(`Edit plan: ${plan.name}`, 'Close', {
      duration: 3000
    });
  }

  togglePlanStatus(plan: Plan) {
    const newStatus = !plan.is_active;
    const action = newStatus ? 'activate' : 'deactivate';

    if (confirm(`Are you sure you want to ${action} the plan "${plan.name}"?`)) {
      this.superAdminService.updatePlan(plan.id, { is_active: newStatus }).subscribe({
        next: (updatedPlan) => {
          const index = this.plans.findIndex(p => p.id === plan.id);
          if (index !== -1) {
            this.plans[index] = updatedPlan;
          }

          this.snackBar.open(`Plan ${action}d successfully`, 'Close', {
            duration: 3000
          });
        },
        error: (error) => {
          this.snackBar.open(`Failed to ${action} plan`, 'Close', {
            duration: 3000
          });
          console.error(`Error ${action}ing plan:`, error);
        }
      });
    }
  }

  deletePlan(plan: Plan) {
    if (!this.canDeletePlan(plan)) {
      return;
    }

    const confirmMessage = `Are you sure you want to delete the plan "${plan.name}"? This action cannot be undone.`;

    if (confirm(confirmMessage)) {
      this.superAdminService.deletePlan(plan.id).subscribe({
        next: () => {
          this.plans = this.plans.filter(p => p.id !== plan.id);
          this.snackBar.open('Plan deleted successfully', 'Close', {
            duration: 3000
          });
        },
        error: (error) => {
          this.snackBar.open('Failed to delete plan', 'Close', {
            duration: 3000
          });
          console.error('Error deleting plan:', error);
        }
      });
    }
  }

  canDeletePlan(plan: Plan): boolean {
    // In a real implementation, you would check if the plan has active subscriptions
    // For now, we'll allow deletion of inactive plans only
    return !plan.is_active;
  }

  formatLimit(limit: number): string {
    if (limit === -1) {
      return 'Unlimited';
    }
    return limit.toString();
  }

  formatStorageLimit(limitMb: number): string {
    if (limitMb === -1) {
      return 'Unlimited';
    }

    if (limitMb >= 1024) {
      const gb = limitMb / 1024;
      return `${gb}GB`;
    }

    return `${limitMb}MB`;
  }
}
