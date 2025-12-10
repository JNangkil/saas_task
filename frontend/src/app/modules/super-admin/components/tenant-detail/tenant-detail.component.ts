import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, TitleCasePipe, DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { SuperAdminService, Tenant } from '../../../../services/super-admin';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { Subscription } from 'rxjs';

// Dialog components (to be implemented)
export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
}

@Component({
  selector: 'app-tenant-detail',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatTooltipModule,
    MatTabsModule,
    TitleCasePipe,
    DatePipe
  ],
  templateUrl: './tenant-detail.html',
  styleUrl: './tenant-detail.css',
})
export class TenantDetailComponent implements OnInit, OnDestroy {
  tenant: Tenant | null = null;
  loading = true;
  error: string | null = null;
  private routeSub: Subscription | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private superAdminService: SuperAdminService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) { }

  ngOnInit() {
    this.routeSub = this.route.params.subscribe(params => {
      const tenantId = params['id'];
      if (tenantId) {
        this.loadTenant(tenantId);
      }
    });
  }

  ngOnDestroy() {
    if (this.routeSub) {
      this.routeSub.unsubscribe();
    }
  }

  loadTenant(tenantId: string) {
    this.loading = true;
    this.error = null;

    this.superAdminService.getTenant(+tenantId).subscribe({
      next: (tenant: Tenant) => {
        this.tenant = tenant;
        this.loading = false;
      },
      error: (error: any) => {
        this.error = 'Failed to load tenant details. Please try again.';
        this.loading = false;
        console.error('Error loading tenant:', error);
      }
    });
  }

  updateTenantStatus(status: 'active' | 'inactive' | 'suspended') {
    if (!this.tenant) return;

    const confirmMessage = `Are you sure you want to ${status} this tenant?`;

    if (confirm(confirmMessage)) {
      this.superAdminService.updateTenantStatus(this.tenant.id, status).subscribe({
        next: (updatedTenant: Tenant) => {
          this.tenant = updatedTenant;
          this.snackBar.open(`Tenant status updated to ${status}`, 'Close', {
            duration: 3000
          });
        },
        error: (error: any) => {
          this.snackBar.open('Failed to update tenant status', 'Close', {
            duration: 3000
          });
          console.error('Error updating tenant status:', error);
        }
      });
    }
  }

  impersonateTenant() {
    if (!this.tenant) return;

    const confirmMessage = 'This will log you in as this tenant. Continue?';

    if (confirm(confirmMessage)) {
      this.superAdminService.impersonateTenant(this.tenant.id).subscribe({
        next: (response: { token: string }) => {
          localStorage.setItem('impersonation_token', response.token);
          this.snackBar.open('Impersonating tenant...', 'Close', {
            duration: 2000
          });

          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 1000);
        },
        error: (error: any) => {
          this.snackBar.open('Failed to impersonate tenant', 'Close', {
            duration: 3000
          });
          console.error('Error impersonating tenant:', error);
        }
      });
    }
  }

  editTenant() {
    // TODO: Implement edit tenant dialog/navigation
    this.snackBar.open('Edit tenant feature coming soon', 'Close', {
      duration: 3000
    });
  }

  changeSubscription() {
    // TODO: Implement change subscription dialog
    this.snackBar.open('Change subscription feature coming soon', 'Close', {
      duration: 3000
    });
  }

  cancelSubscription() {
    if (!this.tenant?.subscription) return;

    const confirmMessage = 'Are you sure you want to cancel this subscription?';

    if (confirm(confirmMessage)) {
      // TODO: Implement cancel subscription
      this.snackBar.open('Cancel subscription feature coming soon', 'Close', {
        duration: 3000
      });
    }
  }

  createSubscription() {
    // TODO: Implement create subscription dialog
    this.snackBar.open('Create subscription feature coming soon', 'Close', {
      duration: 3000
    });
  }

  resetPassword() {
    if (!this.tenant) return;

    const confirmMessage = 'Are you sure you want to reset the tenant owner password?';

    if (confirm(confirmMessage)) {
      // TODO: Implement reset password functionality
      this.snackBar.open('Reset password feature coming soon', 'Close', {
        duration: 3000
      });
    }
  }

  deleteTenant() {
    if (!this.tenant) return;

    const confirmMessage = '⚠️ DANGER: This will permanently delete the tenant and ALL associated data. This action cannot be undone. Type "DELETE" to confirm:';
    const confirmation = prompt(confirmMessage);

    if (confirmation === 'DELETE') {
      // TODO: Implement delete tenant functionality
      this.snackBar.open('Delete tenant feature coming soon', 'Close', {
        duration: 3000
      });
    }
  }

  goBack() {
    this.router.navigate(['/admin/tenants']);
  }
}
