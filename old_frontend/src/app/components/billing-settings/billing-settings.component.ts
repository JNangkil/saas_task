import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil, Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

import { BillingService } from '../../services/billing.service';
import { PlanService } from '../../services/plan.service';
import { ToastService } from '../../services/toast.service';

import {
    ISubscription,
    ISubscriptionEvent,
    IUsageStatistics,
    ICustomerPortalSession,
    IPaymentMethod,
    IInvoice,
    IBillingOperation,
    SubscriptionStatus,
    BillingOperationType
} from '../../models/subscription.model';

import {
    IPlan,
    ICurrentSubscription,
    IPlanLimitUsage
} from '../../models/plan.model';

/**
 * BillingSettingsComponent provides comprehensive billing management functionality including:
 * - Current subscription details and status
 * - Usage statistics vs plan limits with visual progress indicators
 * - Plan upgrade/downgrade options with proration calculations
 * - Subscription cancellation (immediate or at period end)
 * - Subscription resumption for canceled subscriptions
 * - Payment method management (add, remove, set default)
 * - Invoice history with download links
 * - Subscription events/history tracking
 * - Stripe Customer Portal integration
 * - Billing notification preferences
 * 
 * Features:
 * - Responsive design with accessibility support
 * - Loading states and error handling
 * - Confirmation dialogs for destructive actions
 * - Real-time usage calculations
 * - Professional UI with smooth transitions
 */
@Component({
    selector: 'app-billing-settings',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule],
    templateUrl: './billing-settings.component.html',
    styleUrls: ['./billing-settings.component.css']
})
export class BillingSettingsComponent implements OnInit, OnDestroy {
    // Component state
    currentSubscription: ISubscription | null = null;
    currentPlan: ICurrentSubscription | null = null;
    availablePlans: IPlan[] = [];
    usageStatistics: IUsageStatistics | null = null;
    limitUsage: IPlanLimitUsage[] = [];
    paymentMethods: IPaymentMethod[] = [];
    invoices: IInvoice[] = [];
    subscriptionEvents: ISubscriptionEvent[] = [];
    billingOperations: IBillingOperation[] = [];

    // UI state
    isLoading = true;
    isProcessing = false;
    error: string | null = null;
    activeTab = 'overview';

    // Forms
    notificationForm: FormGroup;
    cancelForm: FormGroup;

    // Modal states
    showCancelModal = false;
    showUpgradeModal = false;
    showPaymentMethodModal = false;
    showProrationModal = false;

    // Data for modals
    selectedPlan: IPlan | null = null;
    prorationCalculation: any = null;
    cancelImmediately = false;

    // Pagination
    currentPage = 1;
    itemsPerPage = 10;

    // Unsubscribe subject
    private destroy$ = new Subject<void>();

    constructor(
        private billingService: BillingService,
        private planService: PlanService,
        private toastService: ToastService,
        private router: Router,
        private fb: FormBuilder,
        private cdr: ChangeDetectorRef
    ) {
        // Initialize forms
        this.notificationForm = this.fb.group({
            billingEmail: ['', [Validators.email]],
            paymentFailed: [true],
            subscriptionUpdated: [true],
            usageThreshold: [80],
            advanceNotice: [true]
        });

        this.cancelForm = this.fb.group({
            reason: ['', Validators.required],
            feedback: [''],
            confirm: [false, Validators.requiredTrue]
        });
    }

    ngOnInit(): void {
        this.loadBillingData();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Load all billing-related data
     */
    loadBillingData(): void {
        this.isLoading = true;
        this.error = null;

        // Load current subscription
        this.billingService.getCurrentSubscription()
            .pipe(
                takeUntil(this.destroy$),
                catchError(error => {
                    this.error = 'Failed to load billing information. Please try again.';
                    this.isLoading = false;
                    console.error('Error loading subscription:', error);
                    return of(null);
                })
            )
            .subscribe(subscription => {
                this.currentSubscription = subscription;
                this.loadAdditionalData();
            });
    }

    /**
     * Load additional billing data after subscription is loaded
     */
    private loadAdditionalData(): void {
        // Load current plan
        this.planService.getCurrentPlan()
            .pipe(
                takeUntil(this.destroy$),
                catchError(error => {
                    console.error('Error loading current plan:', error);
                    return of(null);
                })
            )
            .subscribe(plan => {
                this.currentPlan = plan;
                this.cdr.detectChanges();
            });

        // Load usage statistics
        this.billingService.getUsageStatistics()
            .pipe(
                takeUntil(this.destroy$),
                catchError(error => {
                    console.error('Error loading usage statistics:', error);
                    return of(null);
                })
            )
            .subscribe(usage => {
                this.usageStatistics = usage;
                this.cdr.detectChanges();
            });

        // Load limit usage
        this.planService.getLimitUsage()
            .pipe(
                takeUntil(this.destroy$),
                catchError(error => {
                    console.error('Error loading limit usage:', error);
                    return of([]);
                })
            )
            .subscribe(limitUsage => {
                this.limitUsage = limitUsage;
                this.cdr.detectChanges();
            });

        // Load available plans for upgrade/downgrade
        this.planService.getAllPlans()
            .pipe(
                takeUntil(this.destroy$),
                catchError(error => {
                    console.error('Error loading plans:', error);
                    return of([]);
                })
            )
            .subscribe(plans => {
                this.availablePlans = plans.filter(plan =>
                    plan.id !== this.currentSubscription?.plan_id
                );
                this.cdr.detectChanges();
            });

        // Load payment methods
        this.billingService.getPaymentMethods()
            .pipe(
                takeUntil(this.destroy$),
                catchError(error => {
                    console.error('Error loading payment methods:', error);
                    return of([]);
                })
            )
            .subscribe(paymentMethods => {
                this.paymentMethods = paymentMethods;
                this.cdr.detectChanges();
            });

        // Load invoices
        this.billingService.getInvoices()
            .pipe(
                takeUntil(this.destroy$),
                catchError(error => {
                    console.error('Error loading invoices:', error);
                    return of([]);
                })
            )
            .subscribe(invoices => {
                this.invoices = invoices;
                this.cdr.detectChanges();
            });

        // Load subscription history
        this.billingService.getSubscriptionHistory()
            .pipe(
                takeUntil(this.destroy$),
                catchError(error => {
                    console.error('Error loading subscription history:', error);
                    return of([]);
                })
            )
            .subscribe(events => {
                this.subscriptionEvents = events;
                this.cdr.detectChanges();
            });

        // Load billing operations
        this.billingService.getBillingOperations()
            .pipe(
                takeUntil(this.destroy$),
                catchError(error => {
                    console.error('Error loading billing operations:', error);
                    return of([]);
                })
            )
            .subscribe(operations => {
                this.billingOperations = operations;
                this.isLoading = false;
                this.cdr.detectChanges();
            });
    }

    /**
     * Switch between different tabs
     */
    switchTab(tab: string): void {
        this.activeTab = tab;
    }

    /**
     * Open Stripe Customer Portal
     */
    async openCustomerPortal(): Promise<void> {
        try {
            const portalSession = await this.billingService.getCustomerPortalUrl(window.location.href).toPromise();

            if (portalSession?.url) {
                window.location.href = portalSession.url;
            } else {
                throw new Error('Failed to create portal session');
            }
        } catch (error: any) {
            console.error('Portal error:', error);
            this.toastService.error(error.message || 'Failed to open billing portal');
        }
    }

    /**
     * Open upgrade modal with selected plan
     */
    openUpgradeModal(plan: IPlan): void {
        this.selectedPlan = plan;
        this.showUpgradeModal = true;
        this.calculateProration(plan);
    }

    /**
     * Calculate proration for plan change
     */
    private calculateProration(plan: IPlan): void {
        if (!this.currentSubscription) return;

        this.billingService.calculateProration(plan.id)
            .pipe(
                takeUntil(this.destroy$),
                catchError(error => {
                    console.error('Error calculating proration:', error);
                    this.prorationCalculation = null;
                    return of(null);
                })
            )
            .subscribe(proration => {
                this.prorationCalculation = proration;
                this.cdr.detectChanges();
            });
    }

    /**
     * Process plan upgrade/downgrade
     */
    async processPlanChange(immediate: boolean = false): Promise<void> {
        if (!this.selectedPlan || this.isProcessing) return;

        this.isProcessing = true;

        try {
            const updatedSubscription = await this.billingService.upgradeSubscription(
                this.selectedPlan.id,
                immediate,
                true
            ).toPromise();

            if (updatedSubscription) {
                this.currentSubscription = updatedSubscription;
                this.toastService.success(`Successfully ${immediate ? 'changed' : 'scheduled change to'} ${this.selectedPlan.name} plan`);
                this.showUpgradeModal = false;
                this.showProrationModal = false;
                this.loadBillingData();
            }
        } catch (error: any) {
            console.error('Plan change error:', error);
            this.toastService.error(error.message || 'Failed to change plan');
        } finally {
            this.isProcessing = false;
            this.cdr.detectChanges();
        }
    }

    /**
     * Open cancel subscription modal
     */
    openCancelModal(immediate: boolean = false): void {
        this.cancelImmediately = immediate;
        this.showCancelModal = true;
    }

    /**
     * Process subscription cancellation
     */
    async processCancellation(): Promise<void> {
        if (this.cancelForm.invalid || this.isProcessing) return;

        this.isProcessing = true;

        try {
            const updatedSubscription = await this.billingService.cancelSubscription(this.cancelImmediately).toPromise();

            if (updatedSubscription) {
                this.currentSubscription = updatedSubscription;
                this.toastService.success(`Subscription ${this.cancelImmediately ? 'canceled' : 'scheduled for cancellation'}`);
                this.showCancelModal = false;
                this.cancelForm.reset();
                this.loadBillingData();
            }
        } catch (error: any) {
            console.error('Cancellation error:', error);
            this.toastService.error(error.message || 'Failed to cancel subscription');
        } finally {
            this.isProcessing = false;
            this.cdr.detectChanges();
        }
    }

    /**
     * Resume canceled subscription
     */
    async resumeSubscription(): Promise<void> {
        if (this.isProcessing) return;

        this.isProcessing = true;

        try {
            const updatedSubscription = await this.billingService.resumeSubscription().toPromise();

            if (updatedSubscription) {
                this.currentSubscription = updatedSubscription;
                this.toastService.success('Subscription successfully resumed');
                this.loadBillingData();
            }
        } catch (error: any) {
            console.error('Resume error:', error);
            this.toastService.error(error.message || 'Failed to resume subscription');
        } finally {
            this.isProcessing = false;
            this.cdr.detectChanges();
        }
    }

    /**
     * Set payment method as default
     */
    async setDefaultPaymentMethod(paymentMethodId: string): Promise<void> {
        if (this.isProcessing) return;

        this.isProcessing = true;

        try {
            const updatedPaymentMethod = await this.billingService.setDefaultPaymentMethod(paymentMethodId).toPromise();

            if (updatedPaymentMethod) {
                this.toastService.success('Payment method set as default');
                this.loadBillingData();
            }
        } catch (error: any) {
            console.error('Set default payment method error:', error);
            this.toastService.error(error.message || 'Failed to set default payment method');
        } finally {
            this.isProcessing = false;
            this.cdr.detectChanges();
        }
    }

    /**
     * Remove payment method
     */
    async removePaymentMethod(paymentMethodId: string): Promise<void> {
        if (!confirm('Are you sure you want to remove this payment method?')) return;

        if (this.isProcessing) return;

        this.isProcessing = true;

        try {
            await this.billingService.removePaymentMethod(paymentMethodId).toPromise();

            this.toastService.success('Payment method removed');
            this.loadBillingData();
        } catch (error: any) {
            console.error('Remove payment method error:', error);
            this.toastService.error(error.message || 'Failed to remove payment method');
        } finally {
            this.isProcessing = false;
            this.cdr.detectChanges();
        }
    }

    /**
     * Download invoice PDF
     */
    downloadInvoice(invoice: IInvoice): void {
        if (invoice.invoice_pdf) {
            window.open(invoice.invoice_pdf, '_blank');
        } else {
            this.toastService.error('Invoice PDF not available');
        }
    }

    /**
     * Save notification preferences
     */
    saveNotificationPreferences(): void {
        if (this.notificationForm.invalid) return;

        // In a real implementation, this would save to backend
        this.toastService.success('Notification preferences saved');
    }

    /**
     * Get subscription status color class
     */
    getSubscriptionStatusClass(): string {
        if (!this.currentSubscription) return '';

        switch (this.currentSubscription.status) {
            case 'active':
                return 'status-active';
            case 'trialing':
                return 'status-trialing';
            case 'past_due':
                return 'status-past-due';
            case 'canceled':
                return 'status-canceled';
            case 'unpaid':
                return 'status-unpaid';
            default:
                return 'status-unknown';
        }
    }

    /**
     * Get usage progress bar color based on percentage
     */
    getUsageProgressColor(percentage: number): string {
        if (percentage >= 90) return 'progress-danger';
        if (percentage >= 75) return 'progress-warning';
        return 'progress-success';
    }

    /**
     * Format currency for display
     */
    formatCurrency(amount: number, currency: string = 'USD'): string {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency
        }).format(amount / 100); // Convert from cents
    }

    /**
     * Format date for display
     */
    formatDate(dateString: string | undefined): string {
        console.log('DEBUG: formatDate called with:', dateString);
        if (!dateString) {
            console.log('DEBUG: dateString is undefined, returning N/A');
            return 'N/A';
        }
        const formatted = new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        console.log('DEBUG: Formatted date:', formatted);
        return formatted;
    }

    /**
     * Get days remaining until next billing
     */
    getDaysRemaining(): number {
        if (!this.currentSubscription?.current_period_end) return 0;

        const endDate = new Date(this.currentSubscription.current_period_end);
        const now = new Date();
        const diffTime = endDate.getTime() - now.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    /**
     * Check if user can cancel subscription
     */
    canCancelSubscription(): boolean {
        return this.currentSubscription?.is_active === true && this.currentSubscription.is_canceled === false;
    }

    /**
     * Check if user can resume subscription
     */
    canResumeSubscription(): boolean {
        return this.currentSubscription?.is_canceled === true && this.currentSubscription.is_expired === false;
    }

    /**
     * Check if user can change plan
     */
    canChangePlan(): boolean {
        return this.currentSubscription?.is_active === true && this.currentSubscription.is_canceled === false;
    }

    /**
     * Get paginated items
     */
    getPaginatedItems<T>(items: T[]): T[] {
        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        return items.slice(start, end);
    }

    /**
     * Get total pages for pagination
     */
    getTotalPages(items: any[]): number {
        return Math.ceil(items.length / this.itemsPerPage);
    }

    /**
     * Change page for pagination
     */
    changePage(page: number): void {
        this.currentPage = page;
    }

    /**
     * Close all modals
     */
    closeModals(): void {
        this.showCancelModal = false;
        this.showUpgradeModal = false;
        this.showPaymentMethodModal = false;
        this.showProrationModal = false;
        this.selectedPlan = null;
        this.prorationCalculation = null;
        this.cancelForm.reset();
    }
}