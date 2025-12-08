import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { BillingService } from './billing.service';
import { ApiService } from './api.service';
import {
    ISubscription,
    ISubscriptionEvent,
    IUsageStatistics,
    ICheckoutSession,
    IBillingOperation,
    ICustomerPortalSession,
    IProrationCalculation,
    IPaymentMethod,
    IInvoice,
    IBillingSummary,
    SubscriptionStatus,
    BillingOperationType,
    BillingOperationStatus
} from '../models/subscription.model';

describe('BillingService', () => {
    let service: BillingService;
    let httpMock: HttpTestingController;
    let apiServiceSpy: jasmine.SpyObj<ApiService>;
    let routerSpy: jasmine.SpyObj<Router>;

    const mockSubscription: ISubscription = {
        id: 1,
        tenant_id: 1,
        plan_id: 1,
        stripe_subscription_id: 'sub_123',
        status: 'active' as SubscriptionStatus,
        status_display: 'Active',
        trial_ends_at: undefined,
        current_period_start: '2024-01-01T00:00:00Z',
        current_period_end: '2024-02-01T00:00:00Z',
        ends_at: undefined,
        cancel_at_period_end: false,
        is_trialing: false,
        is_active: true,
        is_past_due: false,
        is_canceled: false,
        is_expired: false,
        is_within_grace_period: false,
        trial_days_remaining: 0,
        days_remaining: 30,
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
            features: ['advanced_features', 'priority_support'],
            limits: { max_users: 20, max_workspaces: 10 },
            is_popular: false,
            metadata: {},
            currency: 'USD',
            currency_symbol: '$',
            feature_highlights: ['Advanced features', 'Priority support'],
            limit_highlights: ['20 users', '10 workspaces'],
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
            max_users: 20,
            max_workspaces: 10,
            max_boards: 50
        },
        usage_percentage: {
            users: 25,
            workspaces: 20,
            boards: 20
        },
        is_over_limit: {
            users: false,
            workspaces: false,
            boards: false
        },
        remaining: {
            users: 15,
            workspaces: 8,
            boards: 40
        },
        last_calculated: '2024-01-15T00:00:00Z'
    };

    const mockCheckoutSession: ICheckoutSession = {
        id: 'cs_test_123',
        session_id: 'cs_test_123',
        customer_id: 'cus_test_123',
        subscription_id: 'sub_test_123',
        plan_id: 1,
        payment_method_id: 'pm_test_123',
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel',
        mode: 'subscription',
        status: 'open',
        payment_status: 'unpaid',
        amount_total: 900,
        currency: 'usd',
        customer_email: 'test@example.com',
        trial_period_days: 14,
        metadata: {},
        created_at: '2024-01-01T00:00:00Z',
        expires_at: '2024-01-01T01:00:00Z'
    };

    const mockProration: IProrationCalculation = {
        proration_amount: 2000,
        proration_date: '2024-01-15T00:00:00Z',
        credit_amount: 1500,
        debit_amount: 3500,
        net_amount: 2000,
        currency: 'USD',
        line_items: []
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

    beforeEach(() => {
        const apiSpy = jasmine.createSpyObj('ApiService', [
            'get', 'post', 'put', 'delete'
        ]);

        const routerSpyObj = jasmine.createSpyObj('Router', ['navigate']);

        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [
                BillingService,
                { provide: ApiService, useValue: apiSpy },
                { provide: Router, useValue: routerSpyObj }
            ]
        });

        httpMock = TestBed.inject(HttpTestingController);
        service = TestBed.inject(BillingService);
        apiServiceSpy = TestBed.inject(ApiService) as jasmine.SpyObj<ApiService>;
        routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    });

    afterEach(() => {
        httpMock.verify();
    });

    describe('getCurrentSubscription', () => {
        it('should return current subscription', () => {
            apiServiceSpy.get.and.returnValue(of(mockSubscription));

            service.getCurrentSubscription().subscribe(subscription => {
                expect(subscription).toEqual(mockSubscription);
            });
            expect(apiServiceSpy.get).toHaveBeenCalledWith('subscription/current');
        });

        it('should update subscription cache', () => {
            apiServiceSpy.get.and.returnValue(of(mockSubscription));

            let cachedSubscription: ISubscription | null = null;
            service.currentSubscription$.subscribe(sub => {
                cachedSubscription = sub;
            });

            expect(cachedSubscription).toBeNull();

            service.getCurrentSubscription().subscribe();

            expect(cachedSubscription).toEqual(mockSubscription);
        });

        it('should handle errors', () => {
            const error = new Error('Network error');
            apiServiceSpy.get.and.returnValue(throwError(() => error));

            service.getCurrentSubscription().subscribe({
                next: () => fail('Should have failed'),
                error: (err) => {
                    expect(err.message).toBe('Failed to fetch current subscription');
                }
            });
        });
    });

    describe('createCheckoutSession', () => {
        it('should create checkout session', () => {
            apiServiceSpy.post.and.returnValue(of(mockCheckoutSession));

            service.createCheckoutSession(1, 'pm_123').subscribe(session => {
                expect(session).toEqual(mockCheckoutSession);
            });
            expect(apiServiceSpy.post).toHaveBeenCalledWith('subscription/checkout', {
                plan_id: 1,
                payment_method_id: 'pm_123'
            });
        });

        it('should handle errors', () => {
            const error = new Error('Checkout failed');
            apiServiceSpy.post.and.returnValue(throwError(() => error));

            service.createCheckoutSession(1).subscribe({
                next: () => fail('Should have failed'),
                error: (err) => {
                    expect(err.message).toBe('Failed to create checkout session');
                }
            });
        });
    });

    describe('upgradeSubscription', () => {
        it('should upgrade subscription', () => {
            apiServiceSpy.put.and.returnValue(of(mockSubscription));

            service.upgradeSubscription(2, true, true).subscribe(subscription => {
                expect(subscription).toEqual(mockSubscription);
            });
            expect(apiServiceSpy.put).toHaveBeenCalledWith('subscription/update', {
                plan_id: 2,
                immediate: true,
                prorate: true
            });
        });

        it('should use default values', () => {
            apiServiceSpy.put.and.returnValue(of(mockSubscription));

            service.upgradeSubscription(2).subscribe(subscription => {
                expect(subscription).toEqual(mockSubscription);
            });
            expect(apiServiceSpy.put).toHaveBeenCalledWith('subscription/update', {
                plan_id: 2,
                immediate: false,
                prorate: true
            });
        });

        it('should handle errors', () => {
            const error = new Error('Upgrade failed');
            apiServiceSpy.put.and.returnValue(throwError(() => error));

            service.upgradeSubscription(2).subscribe({
                next: () => fail('Should have failed'),
                error: (err) => {
                    expect(err.message).toBe('Failed to update subscription');
                }
            });
        });
    });

    describe('cancelSubscription', () => {
        it('should cancel subscription', () => {
            apiServiceSpy.post.and.returnValue(of(mockSubscription));

            service.cancelSubscription(true).subscribe(subscription => {
                expect(subscription).toEqual(mockSubscription);
            });
            expect(apiServiceSpy.post).toHaveBeenCalledWith('subscription/cancel', {
                immediately: true
            });
        });

        it('should use default values', () => {
            apiServiceSpy.post.and.returnValue(of(mockSubscription));

            service.cancelSubscription().subscribe(subscription => {
                expect(subscription).toEqual(mockSubscription);
            });
            expect(apiServiceSpy.post).toHaveBeenCalledWith('subscription/cancel', {
                immediately: false
            });
        });

        it('should handle errors', () => {
            const error = new Error('Cancel failed');
            apiServiceSpy.post.and.returnValue(throwError(() => error));

            service.cancelSubscription().subscribe({
                next: () => fail('Should have failed'),
                error: (err) => {
                    expect(err.message).toBe('Failed to cancel subscription');
                }
            });
        });
    });

    describe('resumeSubscription', () => {
        it('should resume subscription', () => {
            apiServiceSpy.post.and.returnValue(of(mockSubscription));

            service.resumeSubscription().subscribe(subscription => {
                expect(subscription).toEqual(mockSubscription);
            });
            expect(apiServiceSpy.post).toHaveBeenCalledWith('subscription/resume', {});
        });

        it('should handle errors', () => {
            const error = new Error('Resume failed');
            apiServiceSpy.post.and.returnValue(throwError(() => error));

            service.resumeSubscription().subscribe({
                next: () => fail('Should have failed'),
                error: (err) => {
                    expect(err.message).toBe('Failed to resume subscription');
                }
            });
        });
    });

    describe('getCustomerPortalUrl', () => {
        it('should get customer portal URL', () => {
            const mockPortalSession: ICustomerPortalSession = {
                id: 'cps_123',
                session_id: 'cps_123',
                customer_id: 'cus_123',
                return_url: 'http://localhost:4200/billing',
                url: 'https://billing.stripe.com/session/123',
                created_at: '2024-01-01T00:00:00Z',
                expires_at: '2024-01-01T01:00:00Z'
            };

            apiServiceSpy.post.and.returnValue(of(mockPortalSession));

            service.getCustomerPortalUrl('http://localhost:4200/billing').subscribe(session => {
                expect(session).toEqual(mockPortalSession);
            });
            expect(apiServiceSpy.post).toHaveBeenCalledWith('subscription/portal', {
                return_url: 'http://localhost:4200/billing'
            });
        });

        it('should handle errors', () => {
            const error = new Error('Portal error');
            apiServiceSpy.post.and.returnValue(throwError(() => error));

            service.getCustomerPortalUrl().subscribe({
                next: () => fail('Should have failed'),
                error: (err) => {
                    expect(err.message).toBe('Failed to create customer portal session');
                }
            });
        });
    });

    describe('getSubscriptionHistory', () => {
        it('should get subscription history', () => {
            const mockEvents: ISubscriptionEvent[] = [
                {
                    id: 1,
                    subscription_id: 1,
                    type: 'created',
                    type_display: 'Created',
                    data: {},
                    processed_at: null,
                    created_at: '2024-01-01T00:00:00Z'
                }
            ];

            apiServiceSpy.get.and.returnValue(of(mockEvents));

            service.getSubscriptionHistory(10, 0).subscribe(events => {
                expect(events).toEqual(mockEvents);
            });
            expect(apiServiceSpy.get).toHaveBeenCalledWith('subscription/history', {
                params: {
                    limit: '10',
                    offset: '0'
                }
            });
        });

        it('should use default pagination', () => {
            const mockEvents: ISubscriptionEvent[] = [];
            apiServiceSpy.get.and.returnValue(of(mockEvents));

            service.getSubscriptionHistory().subscribe(events => {
                expect(events).toEqual(mockEvents);
            });
            expect(apiServiceSpy.get).toHaveBeenCalledWith('subscription/history', {
                params: {
                    limit: '50',
                    offset: '0'
                }
            });
        });

        it('should handle errors', () => {
            const error = new Error('History error');
            apiServiceSpy.get.and.returnValue(throwError(() => error));

            service.getSubscriptionHistory().subscribe({
                next: () => fail('Should have failed'),
                error: (err) => {
                    expect(err.message).toBe('Failed to fetch subscription history');
                }
            });
        });
    });

    describe('getUsageStatistics', () => {
        it('should get usage statistics', () => {
            apiServiceSpy.get.and.returnValue(of(mockUsageStatistics));

            service.getUsageStatistics().subscribe(usage => {
                expect(usage).toEqual(mockUsageStatistics);
            });
            expect(apiServiceSpy.get).toHaveBeenCalledWith('subscription/usage');
        });

        it('should handle errors', () => {
            const error = new Error('Usage error');
            apiServiceSpy.get.and.returnValue(throwError(() => error));

            service.getUsageStatistics().subscribe({
                next: () => fail('Should have failed'),
                error: (err) => {
                    expect(err.message).toBe('Failed to fetch usage statistics');
                }
            });
        });
    });

    describe('getBillingSummary', () => {
        it('should get billing summary', () => {
            const mockSummary: IBillingSummary = {
                current_subscription: mockSubscription,
                upcoming_invoice: null,
                payment_methods: mockPaymentMethods,
                recent_invoices: mockInvoices,
                billing_operations: []
            };

            apiServiceSpy.get.and.returnValue(of(mockSummary));

            service.getBillingSummary().subscribe(summary => {
                expect(summary).toEqual(mockSummary);
            });
            expect(apiServiceSpy.get).toHaveBeenCalledWith('billing/summary');
        });

        it('should handle errors', () => {
            const error = new Error('Summary error');
            apiServiceSpy.get.and.returnValue(throwError(() => error));

            service.getBillingSummary().subscribe({
                next: () => fail('Should have failed'),
                error: (err) => {
                    expect(err.message).toBe('Failed to fetch billing summary');
                }
            });
        });
    });

    describe('calculateProration', () => {
        it('should calculate proration', () => {
            apiServiceSpy.post.and.returnValue(of(mockProration));

            service.calculateProration(2, true).subscribe(proration => {
                expect(proration).toEqual(mockProration);
            });
            expect(apiServiceSpy.post).toHaveBeenCalledWith('subscription/calculate-proration', {
                new_plan_id: 2,
                immediate: true
            });
        });

        it('should handle errors', () => {
            const error = new Error('Proration error');
            apiServiceSpy.post.and.returnValue(throwError(() => error));

            service.calculateProration(2).subscribe({
                next: () => fail('Should have failed'),
                error: (err) => {
                    expect(err.message).toBe('Failed to calculate proration');
                }
            });
        });
    });

    describe('getPaymentMethods', () => {
        it('should get payment methods', () => {
            apiServiceSpy.get.and.returnValue(of(mockPaymentMethods));

            service.getPaymentMethods().subscribe(methods => {
                expect(methods).toEqual(mockPaymentMethods);
            });
            expect(apiServiceSpy.get).toHaveBeenCalledWith('billing/payment-methods');
        });

        it('should handle errors', () => {
            const error = new Error('Payment methods error');
            apiServiceSpy.get.and.returnValue(throwError(() => error));

            service.getPaymentMethods().subscribe({
                next: () => fail('Should have failed'),
                error: (err) => {
                    expect(err.message).toBe('Failed to fetch payment methods');
                }
            });
        });
    });

    describe('addPaymentMethod', () => {
        it('should add payment method', () => {
            const mockCardElement = { cardNumber: '4242424242424242' };
            const mockBillingAddress = { line1: '123 Test St' };

            // Mock Stripe createPaymentMethod
            spyOn(service as any, 'createPaymentMethod').and.returnValue(of({
                id: 'pm_new123'
            }));

            apiServiceSpy.post.and.returnValue(of(mockPaymentMethods[0]));

            service.addPaymentMethod(mockCardElement, mockBillingAddress).subscribe(method => {
                expect(method).toEqual(mockPaymentMethods[0]);
            });
            expect(apiServiceSpy.post).toHaveBeenCalledWith('billing/payment-methods', {
                payment_method_id: 'pm_new123'
            });
        });

        it('should handle Stripe errors', () => {
            const mockCardElement = { cardNumber: '4000000000000002' };
            const error = { message: 'Your card was declined' };

            spyOn(service as any, 'createPaymentMethod').and.returnValue(throwError(() => error));

            service.addPaymentMethod(mockCardElement).subscribe({
                next: () => fail('Should have failed'),
                error: (err) => {
                    expect(err.message).toBe('Failed to add payment method');
                }
            });
        });

        it('should handle API errors', () => {
            const mockCardElement = { cardNumber: '4242424242424242' };
            const apiError = new Error('API error');
            apiServiceSpy.post.and.returnValue(throwError(() => apiError));

            spyOn(service as any, 'createPaymentMethod').and.returnValue(of({
                id: 'pm_new123'
            }));

            service.addPaymentMethod(mockCardElement).subscribe({
                next: () => fail('Should have failed'),
                error: (err) => {
                    expect(err.message).toBe('Failed to add payment method');
                }
            });
        });
    });

    describe('removePaymentMethod', () => {
        it('should remove payment method', () => {
            apiServiceSpy.delete.and.returnValue(of(undefined));

            service.removePaymentMethod('pm_123').subscribe(() => {
                expect(apiServiceSpy.delete).toHaveBeenCalledWith('billing/payment-methods/pm_123');
            });
        });

        it('should handle errors', () => {
            const error = new Error('Remove error');
            apiServiceSpy.delete.and.returnValue(throwError(() => error));

            service.removePaymentMethod('pm_123').subscribe({
                next: () => fail('Should have failed'),
                error: (err) => {
                    expect(err.message).toBe('Failed to remove payment method');
                }
            });
        });
    });

    describe('setDefaultPaymentMethod', () => {
        it('should set default payment method', () => {
            apiServiceSpy.put.and.returnValue(of(mockPaymentMethods[0]));

            service.setDefaultPaymentMethod('pm_123').subscribe(method => {
                expect(method).toEqual(mockPaymentMethods[0]);
            });
            expect(apiServiceSpy.put).toHaveBeenCalledWith('billing/payment-methods/pm_123/default');
        });

        it('should handle errors', () => {
            const error = new Error('Set default error');
            apiServiceSpy.put.and.returnValue(throwError(() => error));

            service.setDefaultPaymentMethod('pm_123').subscribe({
                next: () => fail('Should have failed'),
                error: (err) => {
                    expect(err.message).toBe('Failed to set default payment method');
                }
            });
        });
    });

    describe('getInvoices', () => {
        it('should get invoices', () => {
            apiServiceSpy.get.and.returnValue(of(mockInvoices));

            service.getInvoices(10, 'in_123').subscribe(invoices => {
                expect(invoices).toEqual(mockInvoices);
            });
            expect(apiServiceSpy.get).toHaveBeenCalledWith('billing/invoices', {
                params: {
                    limit: '10',
                    starting_after: 'in_123'
                }
            });
        });

        it('should use default parameters', () => {
            apiServiceSpy.get.and.returnValue(of(mockInvoices));

            service.getInvoices().subscribe(invoices => {
                expect(invoices).toEqual(mockInvoices);
            });
            expect(apiServiceSpy.get).toHaveBeenCalledWith('billing/invoices', {
                params: {
                    limit: '50'
                }
            });
        });

        it('should handle errors', () => {
            const error = new Error('Invoices error');
            apiServiceSpy.get.and.returnValue(throwError(() => error));

            service.getInvoices().subscribe({
                next: () => fail('Should have failed'),
                error: (err) => {
                    expect(err.message).toBe('Failed to fetch invoices');
                }
            });
        });
    });

    describe('getBillingOperations', () => {
        it('should get billing operations', () => {
            const mockOperations: IBillingOperation[] = [
                {
                    id: 1,
                    subscription_id: 1,
                    type: 'payment_succeeded' as BillingOperationType,
                    type_display: 'Payment Succeeded',
                    amount: 2900,
                    currency: 'USD',
                    status: 'completed' as BillingOperationStatus,
                    status_display: 'Completed',
                    description: 'Monthly subscription payment',
                    created_at: '2024-01-01T00:00:00Z'
                }
            ];

            apiServiceSpy.get.and.returnValue(of(mockOperations));

            service.getBillingOperations(10, 0, 'payment_succeeded').subscribe(operations => {
                expect(operations).toEqual(mockOperations);
            });
            expect(apiServiceSpy.get).toHaveBeenCalledWith('billing/operations', {
                params: {
                    limit: '10',
                    offset: '0',
                    operation_type: 'payment_succeeded'
                }
            });
        });

        it('should use default parameters', () => {
            const mockOperations: IBillingOperation[] = [];
            apiServiceSpy.get.and.returnValue(of(mockOperations));

            service.getBillingOperations().subscribe(operations => {
                expect(operations).toEqual(mockOperations);
            });
            expect(apiServiceSpy.get).toHaveBeenCalledWith('billing/operations', {
                params: {
                    limit: '50',
                    offset: '0'
                }
            });
        });

        it('should handle errors', () => {
            const error = new Error('Operations error');
            apiServiceSpy.get.and.returnValue(throwError(() => error));

            service.getBillingOperations().subscribe({
                next: () => fail('Should have failed'),
                error: (err) => {
                    expect(err.message).toBe('Failed to fetch billing operations');
                }
            });
        });
    });

    describe('clearCache', () => {
        it('should clear subscription cache', () => {
            let cachedSubscription: ISubscription | null = mockSubscription;
            service.currentSubscription$.subscribe(sub => {
                cachedSubscription = sub;
            });

            service.clearCache();

            expect(cachedSubscription).toBeNull();
        });
    });

    describe('refreshSubscription', () => {
        it('should refresh subscription data', () => {
            apiServiceSpy.get.and.returnValue(of(mockSubscription));

            service.refreshSubscription().subscribe(subscription => {
                expect(subscription).toEqual(mockSubscription);
            });
            expect(apiServiceSpy.get).toHaveBeenCalledWith('subscription/current');
        });
    });

    describe('redirectToCheckout', () => {
        it('should redirect to Stripe checkout', async () => {
            // Mock Stripe
            const mockStripe = {
                redirectToCheckout: jasmine.createSpy('redirectToCheckout').and.returnValue(Promise.resolve())
            };
            (window as any).Stripe = () => mockStripe;

            await service.redirectToCheckout('cs_test_123');

            expect(mockStripe.redirectToCheckout).toHaveBeenCalledWith({
                sessionId: 'cs_test_123'
            });
        });

        it('should handle Stripe errors', async () => {
            const mockStripe = {
                redirectToCheckout: jasmine.createSpy('redirectToCheckout').and.returnValue(
                    Promise.resolve({ error: { message: 'Checkout failed' } })
                )
            };
            (window as any).Stripe = () => mockStripe;

            try {
                await service.redirectToCheckout('cs_test_123');
                fail('Should have thrown error');
            } catch (error) {
                expect(error.message).toBe('Failed to redirect to checkout');
            }
        });
    });

    describe('error handling', () => {
        it('should handle 400 errors', () => {
            const error = { status: 400 };
            apiServiceSpy.get.and.returnValue(throwError(() => error));

            service.getCurrentSubscription().subscribe({
                next: () => fail('Should have failed'),
                error: (err) => {
                    expect(err.message).toBe('Invalid request. Please check your input and try again.');
                }
            });
        });

        it('should handle 401 errors', () => {
            const error = { status: 401 };
            apiServiceSpy.get.and.returnValue(throwError(() => error));

            service.getCurrentSubscription().subscribe({
                next: () => fail('Should have failed'),
                error: (err) => {
                    expect(err.message).toBe('Unauthorized. Please log in again.');
                }
            });
        });

        it('should handle 403 errors', () => {
            const error = { status: 403 };
            apiServiceSpy.get.and.returnValue(throwError(() => error));

            service.getCurrentSubscription().subscribe({
                next: () => fail('Should have failed'),
                error: (err) => {
                    expect(err.message).toBe('Forbidden. You do not have permission to perform this action.');
                }
            });
        });

        it('should handle 404 errors', () => {
            const error = { status: 404 };
            apiServiceSpy.get.and.returnValue(throwError(() => error));

            service.getCurrentSubscription().subscribe({
                next: () => fail('Should have failed'),
                error: (err) => {
                    expect(err.message).toBe('The requested resource was not found.');
                }
            });
        });

        it('should handle 422 errors', () => {
            const error = {
                status: 422,
                error: {
                    errors: {
                        plan_id: ['The selected plan is invalid.'],
                        payment_method_id: ['Payment method is required.']
                    }
                }
            };
            apiServiceSpy.post.and.returnValue(throwError(() => error));

            service.createCheckoutSession(1).subscribe({
                next: () => fail('Should have failed'),
                error: (err) => {
                    expect(err.message).toBe('The selected plan is invalid., Payment method is required.');
                }
            });
        });

        it('should handle 429 errors', () => {
            const error = { status: 429 };
            apiServiceSpy.get.and.returnValue(throwError(() => error));

            service.getCurrentSubscription().subscribe({
                next: () => fail('Should have failed'),
                error: (err) => {
                    expect(err.message).toBe('Too many requests. Please try again later.');
                }
            });
        });

        it('should handle 500 errors', () => {
            const error = { status: 500 };
            apiServiceSpy.get.and.returnValue(throwError(() => error));

            service.getCurrentSubscription().subscribe({
                next: () => fail('Should have failed'),
                error: (err) => {
                    expect(err.message).toBe('Server error. Please try again later.');
                }
            });
        });

        it('should handle 503 errors', () => {
            const error = { status: 503 };
            apiServiceSpy.get.and.returnValue(throwError(() => error));

            service.getCurrentSubscription().subscribe({
                next: () => fail('Should have failed'),
                error: (err) => {
                    expect(err.message).toBe('Service unavailable. Please try again later.');
                }
            });
        });
    });
});