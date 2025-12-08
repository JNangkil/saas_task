import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { BillingSettingsComponent } from './billing-settings.component';
import { BillingService } from '../../services/billing.service';
import { PlanService } from '../../services/plan.service';
import { ToastService } from '../../services/toast.service';

import {
    ISubscription,
    IUsageStatistics,
    IPaymentMethod,
    IInvoice,
    ISubscriptionEvent,
    IBillingOperation,
    ICustomerPortalSession
} from '../../models/subscription.model';

import {
    IPlan,
    ICurrentSubscription,
    IPlanLimitUsage
} from '../../models/plan.model';

describe('BillingSettingsComponent', () => {
    let component: BillingSettingsComponent;
    let fixture: ComponentFixture<BillingSettingsComponent>;
    let billingServiceSpy: jasmine.SpyObj<BillingService>;
    let planServiceSpy: jasmine.SpyObj<PlanService>;
    let toastServiceSpy: jasmine.SpyObj<ToastService>;
    let routerSpy: jasmine.SpyObj<Router>;

    const mockSubscription: ISubscription = {
        id: 1,
        tenant_id: 1,
        plan_id: 1,
        status: 'active',
        status_display: 'Active',
        current_period_start: '2024-01-01T00:00:00Z',
        current_period_end: '2024-02-01T00:00:00Z',
        cancel_at_period_end: false,
        is_trialing: false,
        is_active: true,
        is_past_due: false,
        is_canceled: false,
        is_expired: false,
        is_within_grace_period: false,
        trial_days_remaining: 0,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        plan: {
            id: 1,
            name: 'Professional',
            slug: 'professional',
            price: '29',
            formatted_price: '$29',
            billing_interval: 'month',
            billing_interval_display: 'Monthly',
            trial_days: 14,
            features: ['feature1', 'feature2'],
            limits: { max_users: 10, max_workspaces: 5 },
            is_popular: false,
            metadata: {},
            currency: 'USD',
            currency_symbol: '$',
            feature_highlights: ['Unlimited projects', 'Priority support'],
            limit_highlights: ['10 users', '5 workspaces'],
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
        }
    };

    const mockUsageStatistics: IUsageStatistics = {
        current_usage: {
            users: 5,
            workspaces: 2,
            boards: 10
        },
        limits: {
            max_users: 10,
            max_workspaces: 5,
            max_boards: 20
        },
        usage_percentage: {
            users: 50,
            workspaces: 40,
            boards: 50
        },
        is_over_limit: {
            users: false,
            workspaces: false,
            boards: false
        },
        remaining: {
            users: 5,
            workspaces: 3,
            boards: 10
        },
        last_calculated: '2024-01-15T00:00:00Z'
    };

    const mockPaymentMethods: IPaymentMethod[] = [
        {
            id: 'pm_123',
            type: 'card',
            card: {
                brand: 'visa',
                last4: '4242',
                exp_month: 12,
                exp_year: 2025,
                fingerprint: 'finger123',
                funding: 'credit'
            },
            is_default: true,
            created_at: '2024-01-01T00:00:00Z'
        }
    ];

    const mockInvoices: IInvoice[] = [
        {
            id: 'in_123',
            number: 'INV-001',
            status: 'paid',
            amount_due: 2900,
            amount_paid: 2900,
            amount_remaining: 0,
            currency: 'USD',
            period_start: '2024-01-01T00:00:00Z',
            period_end: '2024-02-01T00:00:00Z',
            created_at: '2024-01-01T00:00:00Z',
            hosted_invoice_url: 'https://invoice.stripe.com/123',
            invoice_pdf: 'https://invoice.stripe.com/123.pdf',
            lines: []
        }
    ];

    const mockPlans: IPlan[] = [
        {
            id: 2,
            name: 'Business',
            slug: 'business',
            price: '49',
            formatted_price: '$49',
            billing_interval: 'month',
            billing_interval_display: 'Monthly',
            trial_days: 14,
            features: ['feature1', 'feature2', 'feature3'],
            limits: { max_users: 25, max_workspaces: 15 },
            is_popular: false,
            metadata: {},
            currency: 'USD',
            currency_symbol: '$',
            feature_highlights: ['Unlimited projects', 'Priority support', 'Advanced analytics'],
            limit_highlights: ['25 users', '15 workspaces'],
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
        }
    ];

    beforeEach(waitForAsync(() => {
        const billingSpy = jasmine.createSpyObj('BillingService', [
            'getCurrentSubscription',
            'getUsageStatistics',
            'getPaymentMethods',
            'getInvoices',
            'getSubscriptionHistory',
            'getBillingOperations',
            'getCustomerPortalUrl',
            'upgradeSubscription',
            'cancelSubscription',
            'resumeSubscription',
            'setDefaultPaymentMethod',
            'removePaymentMethod',
            'calculateProration'
        ]);

        const planSpy = jasmine.createSpyObj('PlanService', [
            'getCurrentPlan',
            'getLimitUsage',
            'getAllPlans'
        ]);

        const toastSpy = jasmine.createSpyObj('ToastService', [
            'success',
            'error',
            'info',
            'warning'
        ]);

        const routerSpyObj = jasmine.createSpyObj('Router', ['navigate']);

        TestBed.configureTestingModule({
            imports: [
                CommonModule,
                FormsModule,
                ReactiveFormsModule,
                BillingSettingsComponent
            ],
            providers: [
                FormBuilder,
                { provide: BillingService, useValue: billingSpy },
                { provide: PlanService, useValue: planSpy },
                { provide: ToastService, useValue: toastSpy },
                { provide: Router, useValue: routerSpyObj }
            ]
        }).compileComponents();

        billingServiceSpy = TestBed.inject(BillingService) as jasmine.SpyObj<BillingService>;
        planServiceSpy = TestBed.inject(PlanService) as jasmine.SpyObj<PlanService>;
        toastServiceSpy = TestBed.inject(ToastService) as jasmine.SpyObj<ToastService>;
        routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(BillingSettingsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize with default values', () => {
        expect(component.isLoading).toBe(true);
        expect(component.error).toBeNull();
        expect(component.activeTab).toBe('overview');
        expect(component.currentPage).toBe(1);
        expect(component.itemsPerPage).toBe(10);
    });

    describe('ngOnInit', () => {
        it('should load billing data on initialization', () => {
            billingServiceSpy.getCurrentSubscription.and.returnValue(of(mockSubscription));
            planServiceSpy.getCurrentPlan.and.returnValue(of({} as ICurrentSubscription));
            billingServiceSpy.getUsageStatistics.and.returnValue(of(mockUsageStatistics));
            planServiceSpy.getLimitUsage.and.returnValue(of([] as IPlanLimitUsage[]));
            planServiceSpy.getAllPlans.and.returnValue(of(mockPlans));
            billingServiceSpy.getPaymentMethods.and.returnValue(of(mockPaymentMethods));
            billingServiceSpy.getInvoices.and.returnValue(of(mockInvoices));
            billingServiceSpy.getSubscriptionHistory.and.returnValue(of([] as ISubscriptionEvent[]));
            billingServiceSpy.getBillingOperations.and.returnValue(of([] as IBillingOperation[]));

            component.ngOnInit();
            fixture.detectChanges();

            expect(billingServiceSpy.getCurrentSubscription).toHaveBeenCalled();
        });

        it('should handle error when loading subscription', () => {
            billingServiceSpy.getCurrentSubscription.and.returnValue(throwError(() => new Error('Network error')));

            component.ngOnInit();
            fixture.detectChanges();

            expect(component.error).toBe('Failed to load billing information. Please try again.');
            expect(component.isLoading).toBe(false);
        });
    });

    describe('switchTab', () => {
        it('should switch active tab', () => {
            component.switchTab('payment');
            expect(component.activeTab).toBe('payment');
        });
    });

    describe('openCustomerPortal', () => {
        it('should open customer portal successfully', async () => {
            const mockPortalSession: ICustomerPortalSession = {
                id: 'cps_123',
                session_id: 'cps_123',
                customer_id: 'cus_123',
                return_url: 'http://localhost:4200/billing',
                url: 'https://billing.stripe.com/session/123',
                created_at: '2024-01-01T00:00:00Z',
                expires_at: '2024-01-01T01:00:00Z'
            };

            billingServiceSpy.getCustomerPortalUrl.and.returnValue(of(mockPortalSession));
            spyOn(window, 'open');

            await component.openCustomerPortal();

            expect(billingServiceSpy.getCustomerPortalUrl).toHaveBeenCalledWith(window.location.href);
        });

        it('should handle portal error', async () => {
            billingServiceSpy.getCustomerPortalUrl.and.returnValue(throwError(() => new Error('Portal error')));

            await component.openCustomerPortal();

            expect(toastServiceSpy.error).toHaveBeenCalledWith('Failed to open billing portal');
        });
    });

    describe('plan management', () => {
        beforeEach(() => {
            component.currentSubscription = mockSubscription;
        });

        it('should open upgrade modal with selected plan', () => {
            const plan = mockPlans[0];
            billingServiceSpy.calculateProration.and.returnValue(of({
                proration_amount: 2000,
                proration_date: '2024-01-15T00:00:00Z',
                credit_amount: 1500,
                debit_amount: 3500,
                net_amount: 2000,
                currency: 'USD',
                line_items: []
            }));

            component.openUpgradeModal(plan);

            expect(component.selectedPlan).toBe(plan);
            expect(component.showUpgradeModal).toBe(true);
            expect(billingServiceSpy.calculateProration).toHaveBeenCalledWith(plan.id);
        });

        it('should process plan change successfully', async () => {
            component.selectedPlan = mockPlans[0];
            billingServiceSpy.upgradeSubscription.and.returnValue(of(mockSubscription));

            await component.processPlanChange(false);

            expect(billingServiceSpy.upgradeSubscription).toHaveBeenCalledWith(
                mockPlans[0].id,
                false,
                true
            );
            expect(toastServiceSpy.success).toHaveBeenCalledWith(
                `Successfully scheduled change to ${mockPlans[0].name} plan`
            );
        });

        it('should handle plan change error', async () => {
            component.selectedPlan = mockPlans[0];
            billingServiceSpy.upgradeSubscription.and.returnValue(throwError(() => new Error('Upgrade error')));

            await component.processPlanChange(false);

            expect(toastServiceSpy.error).toHaveBeenCalledWith('Failed to change plan');
        });
    });

    describe('subscription cancellation', () => {
        beforeEach(() => {
            component.currentSubscription = mockSubscription;
        });

        it('should open cancel modal', () => {
            component.openCancelModal(false);

            expect(component.showCancelModal).toBe(true);
            expect(component.cancelImmediately).toBe(false);
        });

        it('should process cancellation successfully', async () => {
            component.cancelForm.setValue({
                reason: 'too_expensive',
                feedback: 'Too expensive for our needs',
                confirm: true
            });
            billingServiceSpy.cancelSubscription.and.returnValue(of(mockSubscription));

            await component.processCancellation();

            expect(billingServiceSpy.cancelSubscription).toHaveBeenCalledWith(false);
            expect(toastServiceSpy.success).toHaveBeenCalledWith('Subscription scheduled for cancellation');
        });

        it('should not process cancellation if form is invalid', async () => {
            component.cancelForm.setValue({
                reason: '',
                feedback: '',
                confirm: false
            });

            await component.processCancellation();

            expect(billingServiceSpy.cancelSubscription).not.toHaveBeenCalled();
        });
    });

    describe('subscription resumption', () => {
        beforeEach(() => {
            component.currentSubscription = {
                ...mockSubscription,
                status: 'canceled',
                is_canceled: true,
                is_expired: false
            };
        });

        it('should resume subscription successfully', async () => {
            billingServiceSpy.resumeSubscription.and.returnValue(of(mockSubscription));

            await component.resumeSubscription();

            expect(billingServiceSpy.resumeSubscription).toHaveBeenCalled();
            expect(toastServiceSpy.success).toHaveBeenCalledWith('Subscription successfully resumed');
        });

        it('should handle resume error', async () => {
            billingServiceSpy.resumeSubscription.and.returnValue(throwError(() => new Error('Resume error')));

            await component.resumeSubscription();

            expect(toastServiceSpy.error).toHaveBeenCalledWith('Failed to resume subscription');
        });
    });

    describe('payment method management', () => {
        beforeEach(() => {
            component.paymentMethods = mockPaymentMethods;
        });

        it('should set default payment method', async () => {
            billingServiceSpy.setDefaultPaymentMethod.and.returnValue(of(mockPaymentMethods[0]));

            await component.setDefaultPaymentMethod('pm_123');

            expect(billingServiceSpy.setDefaultPaymentMethod).toHaveBeenCalledWith('pm_123');
            expect(toastServiceSpy.success).toHaveBeenCalledWith('Payment method set as default');
        });

        it('should remove payment method', async () => {
            spyOn(window, 'confirm').and.returnValue(true);
            billingServiceSpy.removePaymentMethod.and.returnValue(of(void 0));

            await component.removePaymentMethod('pm_123');

            expect(billingServiceSpy.removePaymentMethod).toHaveBeenCalledWith('pm_123');
            expect(toastServiceSpy.success).toHaveBeenCalledWith('Payment method removed');
        });

        it('should not remove payment method if not confirmed', async () => {
            spyOn(window, 'confirm').and.returnValue(false);

            await component.removePaymentMethod('pm_123');

            expect(billingServiceSpy.removePaymentMethod).not.toHaveBeenCalled();
        });
    });

    describe('utility methods', () => {
        beforeEach(() => {
            component.currentSubscription = mockSubscription;
        });

        it('should return correct subscription status class', () => {
            expect(component.getSubscriptionStatusClass()).toBe('status-active');
        });

        it('should return correct usage progress color', () => {
            expect(component.getUsageProgressColor(50)).toBe('progress-success');
            expect(component.getUsageProgressColor(80)).toBe('progress-warning');
            expect(component.getUsageProgressColor(95)).toBe('progress-danger');
        });

        it('should format currency correctly', () => {
            expect(component.formatCurrency(2900, 'USD')).toBe('$29.00');
        });

        it('should format date correctly', () => {
            const dateString = '2024-01-15T00:00:00Z';
            expect(component.formatDate(dateString)).toContain('2024');
        });

        it('should calculate days remaining correctly', () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 10);
            if (component.currentSubscription) {
                component.currentSubscription.current_period_end = futureDate.toISOString();
            }

            expect(component.getDaysRemaining()).toBeCloseTo(10, -1);
        });

        it('should check if user can cancel subscription', () => {
            expect(component.canCancelSubscription()).toBe(true);
        });

        it('should check if user can resume subscription', () => {
            expect(component.canResumeSubscription()).toBe(false);
        });

        it('should check if user can change plan', () => {
            expect(component.canChangePlan()).toBe(true);
        });
    });

    describe('pagination', () => {
        const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

        it('should return paginated items', () => {
            component.currentPage = 2;
            const paginatedItems = component.getPaginatedItems(items);

            expect(paginatedItems).toEqual([11, 12]);
        });

        it('should calculate total pages', () => {
            const totalPages = component.getTotalPages(items);

            expect(totalPages).toBe(2);
        });

        it('should change page', () => {
            component.changePage(2);

            expect(component.currentPage).toBe(2);
        });
    });

    describe('closeModals', () => {
        it('should close all modals and reset state', () => {
            component.showCancelModal = true;
            component.showUpgradeModal = true;
            component.selectedPlan = mockPlans[0];
            component.prorationCalculation = { amount: 100 };

            component.closeModals();

            expect(component.showCancelModal).toBe(false);
            expect(component.showUpgradeModal).toBe(false);
            expect(component.selectedPlan).toBeNull();
            expect(component.prorationCalculation).toBeNull();
        });
    });

    describe('notification preferences', () => {
        it('should save notification preferences', () => {
            component.notificationForm.setValue({
                billingEmail: 'test@example.com',
                paymentFailed: true,
                subscriptionUpdated: true,
                usageThreshold: 80,
                advanceNotice: true
            });

            component.saveNotificationPreferences();

            expect(toastServiceSpy.success).toHaveBeenCalledWith('Notification preferences saved');
        });

        it('should not save if form is invalid', () => {
            component.notificationForm.setValue({
                billingEmail: 'invalid-email',
                paymentFailed: true,
                subscriptionUpdated: true,
                usageThreshold: 80,
                advanceNotice: true
            });

            component.saveNotificationPreferences();

            expect(toastServiceSpy.success).not.toHaveBeenCalled();
        });
    });

    describe('downloadInvoice', () => {
        it('should download invoice PDF', () => {
            const invoice = mockInvoices[0];
            spyOn(window, 'open');

            component.downloadInvoice(invoice);

            expect(window.open).toHaveBeenCalledWith(invoice.invoice_pdf, '_blank');
        });

        it('should show error if invoice PDF is not available', () => {
            const invoice = { ...mockInvoices[0], invoice_pdf: undefined };

            component.downloadInvoice(invoice);

            expect(toastServiceSpy.error).toHaveBeenCalledWith('Invoice PDF not available');
        });
    });
});