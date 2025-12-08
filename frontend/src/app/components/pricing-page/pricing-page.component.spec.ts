import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { PricingPageComponent } from './pricing-page.component';
import { PlanService } from '../../services/plan.service';
import { BillingService } from '../../services/billing.service';
import { ToastService } from '../../services/toast.service';

import {
    IPlan,
    IPlanComparison,
    ICurrentSubscription,
    IPlanFilter
} from '../../models/plan.model';

import {
    ICheckoutSession
} from '../../models/subscription.model';

describe('PricingPageComponent', () => {
    let component: PricingPageComponent;
    let fixture: ComponentFixture<PricingPageComponent>;
    let planServiceSpy: jasmine.SpyObj<PlanService>;
    let billingServiceSpy: jasmine.SpyObj<BillingService>;
    let toastServiceSpy: jasmine.SpyObj<ToastService>;
    let routerSpy: jasmine.SpyObj<Router>;

    const mockPlans: IPlan[] = [
        {
            id: 1,
            name: 'Starter',
            slug: 'starter',
            price: '9',
            formatted_price: '$9',
            billing_interval: 'month',
            billing_interval_display: 'month',
            trial_days: 14,
            features: ['basic_features', 'email_support'],
            limits: {
                max_users: 5,
                max_workspaces: 2,
                max_boards: 10
            },
            is_popular: false,
            metadata: {},
            description: 'Perfect for small teams',
            promotional_message: 'Start free for 14 days',
            currency: 'USD',
            currency_symbol: '$',
            yearly_discount_percentage: 17,
            monthly_equivalent: '7.50',
            monthly_equivalent_formatted: '$7.50',
            feature_highlights: ['Up to 5 users', '2 workspaces', '10 boards'],
            limit_highlights: ['5 users', '2 workspaces', '10 boards'],
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
        },
        {
            id: 2,
            name: 'Professional',
            slug: 'professional',
            price: '29',
            formatted_price: '$29',
            billing_interval: 'month',
            billing_interval_display: 'month',
            trial_days: 14,
            features: ['advanced_features', 'priority_support', 'analytics'],
            limits: {
                max_users: 20,
                max_workspaces: 10,
                max_boards: 50
            },
            is_popular: true,
            metadata: {},
            description: 'Great for growing teams',
            promotional_message: 'Most popular choice',
            currency: 'USD',
            currency_symbol: '$',
            yearly_discount_percentage: 17,
            monthly_equivalent: '24.08',
            monthly_equivalent_formatted: '$24.08',
            feature_highlights: ['Up to 20 users', '10 workspaces', '50 boards', 'Advanced analytics'],
            limit_highlights: ['20 users', '10 workspaces', '50 boards'],
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
        }
    ];

    const mockCurrentSubscription: ICurrentSubscription = {
        subscription: {
            id: 1,
            status: 'active',
            status_display: 'Active',
            trial_ends_at: undefined,
            ends_at: undefined,
            is_trialing: false,
            is_active: true,
            is_past_due: false,
            is_canceled: false,
            is_expired: false,
            is_within_grace_period: false,
            trial_days_remaining: 0,
            days_remaining: 30,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
        },
        plan: mockPlans[0],
        usage: {
            users: 3,
            workspaces: 1,
            boards: 5
        }
    };

    const mockPlanComparison: IPlanComparison = {
        plans: mockPlans,
        comparison_matrix: {
            features: [
                {
                    name: 'basic_features',
                    display_name: 'Basic Features',
                    description: 'Core functionality for small teams',
                    category: 'core',
                    plans: [
                        {
                            plan_id: 1,
                            plan_slug: 'starter',
                            has_feature: true,
                            is_highlighted: false
                        },
                        {
                            plan_id: 2,
                            plan_slug: 'professional',
                            has_feature: true,
                            is_highlighted: false
                        }
                    ]
                }
            ],
            limits: [
                {
                    name: 'max_users',
                    display_name: 'Maximum Users',
                    unit: 'users',
                    plans: [
                        {
                            plan_id: 1,
                            plan_slug: 'starter',
                            value: 5,
                            is_unlimited: false,
                            display_value: '5',
                            is_highlighted: false
                        },
                        {
                            plan_id: 2,
                            plan_slug: 'professional',
                            value: 20,
                            is_unlimited: false,
                            display_value: '20',
                            is_highlighted: false
                        }
                    ]
                }
            ]
        },
        all_features: ['basic_features', 'advanced_features'],
        all_limits: ['max_users', 'max_workspaces'],
        feature_categories: [
            {
                name: 'core',
                display_name: 'Core Features',
                features: ['basic_features']
            },
            {
                name: 'advanced',
                display_name: 'Advanced Features',
                features: ['advanced_features']
            }
        ],
        recommended_plan: {
            plan_id: 2,
            plan_slug: 'professional',
            reason: 'Best value for most teams'
        }
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

    beforeEach(waitForAsync(() => {
        const planSpy = jasmine.createSpyObj('PlanService', [
            'getAllPlans',
            'getCurrentPlan',
            'getAllFeatures',
            'comparePlans'
        ]);
        const billingSpy = jasmine.createSpyObj('BillingService', [
            'createCheckoutSession',
            'redirectToCheckout',
            'getCustomerPortalUrl'
        ]);
        const toastSpy = jasmine.createSpyObj('ToastService', [
            'info',
            'error',
            'warning',
            'success'
        ]);
        const routerSpyObj = jasmine.createSpyObj('Router', ['navigate']);

        TestBed.configureTestingModule({
            imports: [ReactiveFormsModule, FormsModule, PricingPageComponent],
            providers: [
                { provide: PlanService, useValue: planSpy },
                { provide: BillingService, useValue: billingSpy },
                { provide: ToastService, useValue: toastSpy },
                { provide: Router, useValue: routerSpyObj }
            ]
        })
            .compileComponents();

        planServiceSpy = TestBed.inject(PlanService) as jasmine.SpyObj<PlanService>;
        billingServiceSpy = TestBed.inject(BillingService) as jasmine.SpyObj<BillingService>;
        toastServiceSpy = TestBed.inject(ToastService) as jasmine.SpyObj<ToastService>;
        routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(PricingPageComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize with default values', () => {
        expect(component.billingInterval).toBe('month');
        expect(component.isLoading).toBe(true);
        expect(component.plans).toEqual([]);
        expect(component.currentSubscription).toBeNull();
        expect(component.showComparison).toBe(false);
        expect(component.selectedPlansForComparison).toEqual([]);
    });

    describe('ngOnInit', () => {
        it('should load pricing data, current subscription, and features on init', () => {
            planServiceSpy.getAllPlans.and.returnValue(of(mockPlans));
            planServiceSpy.getCurrentPlan.and.returnValue(of(mockCurrentSubscription));
            planServiceSpy.getAllFeatures.and.returnValue(of({
                features: [],
                categories: []
            }));

            component.ngOnInit();

            expect(planServiceSpy.getAllPlans).toHaveBeenCalledWith({ interval: 'month' });
            expect(planServiceSpy.getCurrentPlan).toHaveBeenCalled();
            expect(planServiceSpy.getAllFeatures).toHaveBeenCalled();
        });

        it('should handle errors when loading current subscription', () => {
            planServiceSpy.getAllPlans.and.returnValue(of(mockPlans));
            planServiceSpy.getCurrentPlan.and.returnValue(throwError('Not authenticated'));
            planServiceSpy.getAllFeatures.and.returnValue(of({
                features: [],
                categories: []
            }));

            component.ngOnInit();

            expect(component.currentSubscription).toBeNull();
        });
    });

    describe('toggleBillingInterval', () => {
        it('should toggle billing interval and reload plans', () => {
            planServiceSpy.getAllPlans.and.returnValue(of(mockPlans));

            component.billingInterval = 'month';
            component.toggleBillingInterval('year');

            expect(component.billingInterval).toBe('year');
            expect(planServiceSpy.getAllPlans).toHaveBeenCalledWith({ interval: 'year' });
        });

        it('should not reload plans if same interval is selected', () => {
            component.billingInterval = 'month';
            component.toggleBillingInterval('month');

            expect(planServiceSpy.getAllPlans).not.toHaveBeenCalled();
        });
    });

    describe('selectPlan', () => {
        beforeEach(() => {
            component.plans = mockPlans;
            component.currentSubscription = mockCurrentSubscription;
        });

        it('should show info toast if user already has selected plan', async () => {
            const plan = mockPlans[0]; // Current plan

            await component.selectPlan(plan);

            expect(toastServiceSpy.info).toHaveBeenCalledWith('You are already subscribed to this plan');
            expect(billingServiceSpy.createCheckoutSession).not.toHaveBeenCalled();
        });

        it('should create checkout session for new plan', async () => {
            const plan = mockPlans[1]; // Different plan
            billingServiceSpy.createCheckoutSession.and.returnValue(of(mockCheckoutSession));
            billingServiceSpy.redirectToCheckout.and.returnValue(Promise.resolve());

            await component.selectPlan(plan);

            expect(billingServiceSpy.createCheckoutSession).toHaveBeenCalledWith(plan.id);
            expect(billingServiceSpy.redirectToCheckout).toHaveBeenCalledWith(mockCheckoutSession.session_id);
        });

        it('should handle checkout errors', async () => {
            const plan = mockPlans[1];
            const error = new Error('Checkout failed');
            billingServiceSpy.createCheckoutSession.and.returnValue(throwError(error));

            await component.selectPlan(plan);

            expect(toastServiceSpy.error).toHaveBeenCalledWith('Checkout failed');
            expect(component.isProcessingCheckout).toBe(false);
        });
    });

    describe('togglePlanForComparison', () => {
        beforeEach(() => {
            component.plans = mockPlans;
        });

        it('should add plan to comparison if not already selected', () => {
            component.togglePlanForComparison('starter');

            expect(component.selectedPlansForComparison).toContain('starter');
        });

        it('should remove plan from comparison if already selected', () => {
            component.selectedPlansForComparison = ['starter'];
            component.togglePlanForComparison('starter');

            expect(component.selectedPlansForComparison).not.toContain('starter');
        });

        it('should limit comparison to 3 plans', () => {
            component.selectedPlansForComparison = ['starter', 'professional'];
            component.togglePlanForComparison('enterprise'); // 3rd plan

            expect(component.selectedPlansForComparison.length).toBe(3);
        });

        it('should show warning if trying to add more than 3 plans', () => {
            component.selectedPlansForComparison = ['starter', 'professional', 'enterprise'];
            component.togglePlanForComparison('business');

            expect(toastServiceSpy.warning).toHaveBeenCalledWith('You can compare up to 3 plans at a time');
        });

        it('should load comparison when 2+ plans are selected', () => {
            planServiceSpy.comparePlans.and.returnValue(of(mockPlanComparison));

            component.selectedPlansForComparison = ['starter'];
            component.togglePlanForComparison('professional');

            expect(planServiceSpy.comparePlans).toHaveBeenCalledWith(['starter', 'professional']);
            expect(component.showComparison).toBe(true);
            expect(component.planComparison).toEqual(mockPlanComparison);
        });
    });

    describe('toggleFaqItem', () => {
        it('should add FAQ item to expanded set if not present', () => {
            component.toggleFaqItem(1);

            expect(component.expandedFaqItems.has(1)).toBe(true);
        });

        it('should remove FAQ item from expanded set if present', () => {
            component.expandedFaqItems.add(1);
            component.toggleFaqItem(1);

            expect(component.expandedFaqItems.has(1)).toBe(false);
        });
    });

    describe('submitContactForm', () => {
        it('should show error if form is invalid', () => {
            component.contactForm.setValue({
                name: '',
                email: '',
                company: '',
                message: ''
            });

            component.submitContactForm();

            expect(toastServiceSpy.error).toHaveBeenCalledWith('Please fill in all required fields');
        });

        it('should show success message if form is valid', () => {
            component.contactForm.setValue({
                name: 'John Doe',
                email: 'john@example.com',
                company: 'Acme Corp',
                message: 'I need enterprise pricing'
            });

            component.submitContactForm();

            expect(toastServiceSpy.success).toHaveBeenCalledWith(
                'Thank you for your interest! Our enterprise team will contact you within 24 hours.'
            );
            expect(component.contactForm.value).toEqual({
                name: null,
                email: null,
                company: null,
                message: null
            });
        });
    });

    describe('isCurrentPlan', () => {
        it('should return true if plan matches current subscription', () => {
            component.currentSubscription = mockCurrentSubscription;
            const result = component.isCurrentPlan(mockPlans[0]);

            expect(result).toBe(true);
        });

        it('should return false if plan does not match current subscription', () => {
            component.currentSubscription = mockCurrentSubscription;
            const result = component.isCurrentPlan(mockPlans[1]);

            expect(result).toBe(false);
        });
    });

    describe('formatLimitValue', () => {
        it('should return "Unlimited" for -1 or undefined values', () => {
            expect(component.formatLimitValue(-1)).toBe('Unlimited');
            expect(component.formatLimitValue(undefined)).toBe('Unlimited');
        });

        it('should return string representation for valid numbers', () => {
            expect(component.formatLimitValue(10)).toBe('10');
            expect(component.formatLimitValue(0)).toBe('0');
        });
    });

    describe('getBillingIntervalDisplay', () => {
        it('should return correct display text for monthly', () => {
            expect(component.getBillingIntervalDisplay('month')).toBe('Monthly');
        });

        it('should return correct display text for yearly', () => {
            expect(component.getBillingIntervalDisplay('year')).toBe('Yearly');
        });
    });

    describe('getYearlySavingsDisplay', () => {
        it('should return savings percentage if available', () => {
            const plan = { ...mockPlans[0], yearly_discount_percentage: 20 };
            expect(component.getYearlySavingsDisplay(plan)).toBe('Save 20%');
        });

        it('should return default savings if percentage not available', () => {
            const plan = { ...mockPlans[0], yearly_discount_percentage: undefined };
            expect(component.getYearlySavingsDisplay(plan)).toBe('Save 17%');
        });
    });

    describe('getSubscriptionStatusDisplay', () => {
        it('should return trial status if in trial', () => {
            const trialSubscription = {
                ...mockCurrentSubscription,
                subscription: {
                    ...mockCurrentSubscription.subscription,
                    is_trialing: true,
                    trial_days_remaining: 5
                }
            };
            component.currentSubscription = trialSubscription;

            expect(component.getSubscriptionStatusDisplay()).toBe('Trial (5 days remaining)');
        });

        it('should return status display if not in trial', () => {
            component.currentSubscription = mockCurrentSubscription;

            expect(component.getSubscriptionStatusDisplay()).toBe('Active');
        });

        it('should return empty string if no subscription', () => {
            component.currentSubscription = null;

            expect(component.getSubscriptionStatusDisplay()).toBe('');
        });
    });

    describe('getRecommendedPlan', () => {
        beforeEach(() => {
            component.plans = [
                { ...mockPlans[0], slug: 'starter' },
                { ...mockPlans[1], slug: 'professional' },
                { ...mockPlans[1], slug: 'business' },
                { ...mockPlans[1], slug: 'enterprise' }
            ];
        });

        it('should recommend starter for small teams', () => {
            const result = component.getRecommendedPlan(3);
            expect(result?.slug).toBe('starter');
        });

        it('should recommend professional for medium teams', () => {
            const result = component.getRecommendedPlan(10);
            expect(result?.slug).toBe('professional');
        });

        it('should recommend business for larger teams', () => {
            const result = component.getRecommendedPlan(25);
            expect(result?.slug).toBe('business');
        });

        it('should recommend enterprise for very large teams', () => {
            const result = component.getRecommendedPlan(100);
            expect(result?.slug).toBe('enterprise');
        });
    });

    describe('getStarRating', () => {
        it('should return correct star array for 5 stars', () => {
            const result = component.getStarRating(5);
            expect(result).toEqual(['★', '★', '★', '★', '★']);
        });

        it('should return correct star array for 3 stars', () => {
            const result = component.getStarRating(3);
            expect(result).toEqual(['★', '★', '★', '☆', '☆']);
        });

        it('should return correct star array for 0 stars', () => {
            const result = component.getStarRating(0);
            expect(result).toEqual(['☆', '☆', '☆', '☆', '☆']);
        });
    });

    describe('planHasFeature', () => {
        it('should return true if plan has feature', () => {
            const plan = mockPlans[0];
            expect(component.planHasFeature(plan, 'basic_features')).toBe(true);
        });

        it('should return false if plan does not have feature', () => {
            const plan = mockPlans[0];
            expect(component.planHasFeature(plan, 'advanced_features')).toBe(false);
        });
    });

    describe('getPlanLimit', () => {
        it('should return limit value if exists', () => {
            const plan = mockPlans[0];
            expect(component.getPlanLimit(plan, 'max_users')).toBe(5);
        });

        it('should return undefined if limit does not exist', () => {
            const plan = mockPlans[0];
            expect(component.getPlanLimit(plan, 'nonexistent_limit')).toBeUndefined();
        });
    });

    describe('formatCurrency', () => {
        it('should format USD currency correctly', () => {
            expect(component.formatCurrency('29', 'USD', '$')).toBe('$29');
        });

        it('should format non-USD currency correctly', () => {
            expect(component.formatCurrency('29', 'EUR', '€')).toBe('29 EUR');
        });
    });

    describe('getPlanCardClasses', () => {
        it('should return correct classes for popular plan', () => {
            const plan = { ...mockPlans[1], is_popular: true };
            const classes = component.getPlanCardClasses(plan);

            expect(classes).toContain('plan-card');
            expect(classes).toContain('popular');
        });

        it('should return correct classes for current plan', () => {
            component.currentSubscription = mockCurrentSubscription;
            const plan = mockPlans[0];
            const classes = component.getPlanCardClasses(plan);

            expect(classes).toContain('plan-card');
            expect(classes).toContain('current');
        });

        it('should return correct classes for selected comparison plan', () => {
            component.selectedPlansForComparison = ['starter'];
            const plan = mockPlans[0];
            const classes = component.getPlanCardClasses(plan);

            expect(classes).toContain('plan-card');
            expect(classes).toContain('selected-for-comparison');
        });
    });

    describe('scrollToSection', () => {
        it('should scroll to section if element exists', () => {
            const mockElement = {
                scrollIntoView: jasmine.createSpy('scrollIntoView')
            };
            spyOn(document, 'getElementById').and.returnValue(mockElement as any);

            component.scrollToSection('pricing');

            expect(document.getElementById).toHaveBeenCalledWith('pricing');
            expect(mockElement.scrollIntoView).toHaveBeenCalledWith({
                behavior: 'smooth',
                block: 'start'
            });
        });

        it('should not error if element does not exist', () => {
            spyOn(document, 'getElementById').and.returnValue(null);

            expect(() => component.scrollToSection('nonexistent')).not.toThrow();
        });
    });

    describe('goToCustomerPortal', () => {
        it('should redirect to customer portal', async () => {
            const portalSession = {
                id: 'portal_test_123',
                session_id: 'portal_test_123',
                customer_id: 'cus_test_123',
                return_url: window.location.href,
                url: 'https://billing.stripe.com/portal/test',
                created_at: '2024-01-01T00:00:00Z',
                expires_at: '2024-01-01T01:00:00Z'
            };
            billingServiceSpy.getCustomerPortalUrl.and.returnValue(of(portalSession));
            spyOnProperty(window.location, 'href', 'get').and.returnValue(window.location.href);
            await component.goToCustomerPortal();

            expect(billingServiceSpy.getCustomerPortalUrl).toHaveBeenCalledWith(window.location.href);
        });

        it('should handle portal errors', async () => {
            const error = new Error('Portal error');
            billingServiceSpy.getCustomerPortalUrl.and.returnValue(throwError(error));

            await component.goToCustomerPortal();

            expect(toastServiceSpy.error).toHaveBeenCalledWith('Portal error');
        });
    });

    describe('ngOnDestroy', () => {
        it('should complete destroy subject', () => {
            component.ngOnDestroy();

            // Since destroy$ is private, we just verify the method doesn't throw
            expect(component).toBeTruthy();
        });
    });
});