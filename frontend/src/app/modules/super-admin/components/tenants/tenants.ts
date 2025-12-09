import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule, TitleCasePipe, DatePipe } from '@angular/common';
import { SuperAdminService, Tenant, PaginatedResponse } from '../../../../services/super-admin.service';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';

@Component({
  selector: 'app-tenants',
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginator,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatMenuModule,
    MatTooltipModule,
    TitleCasePipe,
    DatePipe
  ],
  templateUrl: './tenants.html',
  styleUrl: './tenants.css',
})
export class Tenants implements OnInit, AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  displayedColumns: string[] = [
    'name',
    'domain',
    'status',
    'users_count',
    'workspaces_count',
    'subscription',
    'created_at',
    'actions'
  ];

  tenants = new MatTableDataSource<Tenant>();
  loading = true;
  error: string | null = null;

  // Pagination and filtering
  totalTenants = 0;
  pageSize = 25;
  currentPage = 1;
  searchTerm = '';
  statusFilter = '';

  constructor(
    private superAdminService: SuperAdminService,
    private snackBar: MatSnackBar,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadTenants();
  }

  ngAfterViewInit() {
    this.tenants.paginator = this.paginator;
  }

  loadTenants() {
    this.loading = true;
    this.error = null;

    const params = {
      search: this.searchTerm,
      status: this.statusFilter,
      per_page: this.pageSize,
      page: this.currentPage
    };

    this.superAdminService.getTenants(params).subscribe({
      next: (response: PaginatedResponse<Tenant>) => {
        this.tenants.data = response.data;
        this.totalTenants = response.total;
        this.loading = false;
      },
      error: (error) => {
        this.error = 'Failed to load tenants. Please try again.';
        this.loading = false;
        console.error('Error loading tenants:', error);
      }
    });
  }

  applySearch(event: Event) {
    const target = event.target as HTMLInputElement;
    this.searchTerm = target.value;
    this.currentPage = 1;

    // Apply search with debounce
    setTimeout(() => {
      this.loadTenants();
    }, 300);
  }

  onStatusChange(event: any) {
    this.statusFilter = event.value;
    this.currentPage = 1;
    this.loadTenants();
  }

  onPageChange(event: PageEvent) {
    this.pageSize = event.pageSize;
    this.currentPage = event.pageIndex + 1;
    this.loadTenants();
  }

  updateTenantStatus(tenantId: number, status: 'active' | 'inactive' | 'suspended') {
    this.superAdminService.updateTenantStatus(tenantId, status).subscribe({
      next: (updatedTenant) => {
        // Update the tenant in the data source
        const index = this.tenants.data.findIndex(t => t.id === tenantId);
        if (index !== -1) {
          this.tenants.data[index] = updatedTenant;
          this.tenants.data = [...this.tenants.data]; // Trigger change detection
        }

        this.snackBar.open(`Tenant status updated to ${status}`, 'Close', {
          duration: 3000
        });
      },
      error: (error) => {
        this.snackBar.open('Failed to update tenant status', 'Close', {
          duration: 3000
        });
        console.error('Error updating tenant status:', error);
      }
    });
  }

  impersonateTenant(tenantId: number) {
    this.superAdminService.impersonateTenant(tenantId).subscribe({
      next: (response) => {
        // Store the impersonation token and redirect
        localStorage.setItem('impersonation_token', response.token);
        this.snackBar.open('Impersonating tenant...', 'Close', {
          duration: 2000
        });

        // Redirect to tenant dashboard
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1000);
      },
      error: (error) => {
        this.snackBar.open('Failed to impersonate tenant', 'Close', {
          duration: 3000
        });
        console.error('Error impersonating tenant:', error);
      }
    });
  }
}
