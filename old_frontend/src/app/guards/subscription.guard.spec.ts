import { TestBed } from '@angular/core/testing';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { of, throwError } from 'rxjs';

import { SubscriptionGuard } from './subscription.guard';
import { BillingService } from '../services/billing.service';
import {
    ISubscription,
    SubscriptionStatus
} from '../models/subscription.model';
import { IPlan } from '../models/plan.model';

describe('SubscriptionGuard', () => {
    let guard: SubscriptionGuard;
    let billingServiceSpy: jasmine.SpyObj<BillingService>;
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
            features: ['advanced_features', 'priority_support', 'analytics'],
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

    const mockBasicPlan: IPlan = {
        id: 1,
        name: 'Starter',
        slug: 'starter',
        price: '9',
        formatted_price: '$9',
        billing_interval: 'month',
        billing_interval_display: 'Monthly',
        trial_days: 14,
        features: ['basic_features', 'email_support'],
        limits: { max_users: 5, max_workspaces: 2 },
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
    };

    const mockProPlan: IPlan = {
        id: 2,
        name: 'Professional',
        slug: 'professional',
        price: '29',
        formatted_price: '$29',
        billing_interval: 'month',
        billing_interval_display: 'Monthly',
        trial_days: 14,
        features: ['advanced_features', 'priority_support', 'analytics'],
        limits: { max_users: 20, max_workspaces: 10 },
        is_popular: true,
        metadata: {},
        description: 'Great for growing teams',
        promotional_message: 'Most popular choice',
        currency: 'USD',
        currency_symbol: '$',
        yearly_discount_percentage: 17,
        monthly_equivalent: '24.08',
        monthly_equivalent_formatted: '$24.08',
        feature_highlights: ['Up to 20 users', '10 workspaces', 'Advanced analytics'],
        limit_highlights: ['20 users', '10 workspaces'],
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
    };

    beforeEach(() => {
        const billingSpy = jasmine.createSpyObj('BillingService', ['getCurrentSubscription']);
        const routerSpyObj = jasmine.createSpyObj('Router', ['navigate']);

        TestBed.configureTestingModule({
            providers: [
                SubscriptionGuard,
                { provide: BillingService, useValue: billingSpy },
                { provide: Router, useValue: routerSpyObj }
            ]
        });

        guard = TestBed.inject(SubscriptionGuard);
        billingServiceSpy = TestBed.inject(BillingService) as jasmine.SpyObj<BillingService>;
        routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    });

    describe('canActivate', () => {
        it('should allow access when route has no subscription requirements', (done) => {
            const mockRoute = { data: {} } as ActivatedRouteSnapshot;
            const mockState = { url: '/dashboard' } as RouterStateSnapshot;

            billingServiceSpy.getCurrentSubscription.and.returnValue(of(mockSubscription));

            const result = guard.canActivate(mockRoute, mockState);

            result.subscribe(accessAllowed => {
                expect(accessAllowed).toBe(true);
                done();
            });
        });

        it('should allow access when subscription is active', (done) => {
            const mockRoute = {
                data: { requiresSubscription: true }
            } as unknown as ActivatedRouteSnapshot;
            const mockState = { url: '/analytics' } as RouterStateSnapshot;

            billingServiceSpy.getCurrentSubscription.and.returnValue(of(mockSubscription));

            const result = guard.canActivate(mockRoute, mockState);

            result.subscribe(accessAllowed => {
                expect(accessAllowed).toBe(true);
                done();
            });
        });

        it('should allow access when subscription is in trial', (done) => {
            const mockRoute = {
                data: { requiresSubscription: true, allowGracePeriod: true }
            } as unknown as ActivatedRouteSnapshot;
            const mockState = { url: '/analytics' } as RouterStateSnapshot;

            const trialSubscription = {
                ...mockSubscription,
                status: 'trialing' as SubscriptionStatus,
                is_trialing: true
            };

            billingServiceSpy.getCurrentSubscription.and.returnValue(of(trialSubscription));

            const result = guard.canActivate(mockRoute, mockState);

            result.subscribe(accessAllowed => {
                expect(accessAllowed).toBe(true);
                done();
            });
        });

        it('should allow access when subscription is within grace period', (done) => {
            const mockRoute = {
                data: { requiresSubscription: true, allowGracePeriod: true }
            } as unknown as ActivatedRouteSnapshot;
            const mockState = { url: '/analytics' } as RouterStateSnapshot;

            const gracePeriodSubscription = {
                ...mockSubscription,
                status: 'canceled' as SubscriptionStatus,
                is_within_grace_period: true,
                ends_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
            };

            billingServiceSpy.getCurrentSubscription.and.returnValue(of(gracePeriodSubscription));

            const result = guard.canActivate(mockRoute, mockState);

            result.subscribe(accessAllowed => {
                expect(accessAllowed).toBe(true);
                done();
            });
        });

        it('should deny access when no subscription', (done) => {
            const mockRoute = {
                data: { requiresSubscription: true }
            } as unknown as ActivatedRouteSnapshot;
            const mockState = { url: '/analytics' } as RouterStateSnapshot;

            billingServiceSpy.getCurrentSubscription.and.returnValue(of(null as any));

            const result = guard.canActivate(mockRoute, mockState);

            result.subscribe(accessAllowed => {
                expect(accessAllowed).toBe(false);
                expect(routerSpy.navigate).toHaveBeenCalledWith(['/billing']);
                done();
            });
        });

        it('should deny access when subscription is expired', (done) => {
            const mockRoute = {
                data: { requiresSubscription: true }
            } as unknown as ActivatedRouteSnapshot;
            const mockState = { url: '/analytics' } as RouterStateSnapshot;

            const expiredSubscription = {
                ...mockSubscription,
                status: 'expired' as SubscriptionStatus,
                is_expired: true
            };

            billingServiceSpy.getCurrentSubscription.and.returnValue(of(expiredSubscription));

            const result = guard.canActivate(mockRoute, mockState);

            result.subscribe(accessAllowed => {
                expect(accessAllowed).toBe(false);
                expect(routerSpy.navigate).toHaveBeenCalledWith(['/billing']);
                done();
            });
        });

        it('should deny access when subscription is past due', (done) => {
            const mockRoute = {
                data: { requiresSubscription: true, allowGracePeriod: false }
            } as unknown as ActivatedRouteSnapshot;
            const mockState = { url: '/analytics' } as RouterStateSnapshot;

            const pastDueSubscription = {
                ...mockSubscription,
                status: 'past_due' as SubscriptionStatus,
                is_past_due: true
            };

            billingServiceSpy.getCurrentSubscription.and.returnValue(of(pastDueSubscription));

            const result = guard.canActivate(mockRoute, mockState);

            result.subscribe(accessAllowed => {
                expect(accessAllowed).toBe(false);
                expect(routerSpy.navigate).toHaveBeenCalledWith(['/billing']);
                done();
            });
        });

        it('should deny access when subscription is canceled and not in grace period', (done) => {
            const mockRoute = {
                data: { requiresSubscription: true, allowGracePeriod: false }
            } as unknown as ActivatedRouteSnapshot;
            const mockState = { url: '/analytics' } as RouterStateSnapshot;

            const canceledSubscription = {
                ...mockSubscription,
                status: 'canceled' as SubscriptionStatus,
                is_canceled: true,
                is_within_grace_period: false
            };

            billingServiceSpy.getCurrentSubscription.and.returnValue(of(canceledSubscription));

            const result = guard.canActivate(mockRoute, mockState);

            result.subscribe(accessAllowed => {
                expect(accessAllowed).toBe(false);
                expect(routerSpy.navigate).toHaveBeenCalledWith(['/billing']);
                done();
            });
        });

        it('should check minimum tier requirement', (done) => {
            const mockRoute = {
                data: { requiresSubscription: true, minTier: 'pro' }
            } as unknown as ActivatedRouteSnapshot;
            const mockState = { url: '/analytics' } as RouterStateSnapshot;

            billingServiceSpy.getCurrentSubscription.and.returnValue(of(mockSubscription));

            const result = guard.canActivate(mockRoute, mockState);

            result.subscribe(accessAllowed => {
                expect(accessAllowed).toBe(true);
                done();
            });
        });

        it('should deny access when plan tier is too low', (done) => {
            const mockRoute = {
                data: { requiresSubscription: true, minTier: 'pro' }
            } as unknown as ActivatedRouteSnapshot;
            const mockState = { url: '/analytics' } as RouterStateSnapshot;

            const basicSubscription = {
                ...mockSubscription,
                plan: mockBasicPlan
            };

            billingServiceSpy.getCurrentSubscription.and.returnValue(of(basicSubscription));

            const result = guard.canActivate(mockRoute, mockState);

            result.subscribe(accessAllowed => {
                expect(accessAllowed).toBe(false);
                expect(routerSpy.navigate).toHaveBeenCalledWith(['/billing'], {
                    queryParams: {
                        upgrade: 'true',
                        required_tier: 'pro',
                        current_tier: 'basic'
                    }
                });
                done();
            });
        });

        it('should check required features', (done) => {
            const mockRoute = {
                data: { requiresSubscription: true, requiredFeatures: ['analytics'] }
            } as unknown as ActivatedRouteSnapshot;
            const mockState = { url: '/analytics' } as RouterStateSnapshot;

            billingServiceSpy.getCurrentSubscription.and.returnValue(of(mockSubscription));

            const result = guard.canActivate(mockRoute, mockState);

            result.subscribe(accessAllowed => {
                expect(accessAllowed).toBe(true);
                done();
            });
        });

        it('should deny access when required features are missing', (done) => {
            const mockRoute = {
                data: { requiresSubscription: true, requiredFeatures: ['analytics'] }
            } as unknown as ActivatedRouteSnapshot;
            const mockState = { url: '/analytics' } as RouterStateSnapshot;

            const basicSubscription = {
                ...mockSubscription,
                plan: mockBasicPlan
            };

            billingServiceSpy.getCurrentSubscription.and.returnValue(of(basicSubscription));

            const result = guard.canActivate(mockRoute, mockState);

            result.subscribe(accessAllowed => {
                expect(accessAllowed).toBe(false);
                expect(routerSpy.navigate).toHaveBeenCalledWith(['/billing'], {
                    queryParams: {
                        upgrade: 'true',
                        required_features: 'analytics'
                    }
                });
                done();
            });
        });

        it('should use custom redirect URL', (done) => {
            const mockRoute = {
                data: { requiresSubscription: true, redirectUrl: '/custom-redirect' }
            } as unknown as ActivatedRouteSnapshot;
            const mockState = { url: '/analytics' } as RouterStateSnapshot;

            billingServiceSpy.getCurrentSubscription.and.returnValue(of(null as any));

            const result = guard.canActivate(mockRoute, mockState);

            result.subscribe(accessAllowed => {
                expect(accessAllowed).toBe(false);
                expect(routerSpy.navigate).toHaveBeenCalledWith(['/custom-redirect']);
                done();
            });
        });

        it('should use custom deny message', (done) => {
            const mockRoute = {
                data: { requiresSubscription: true, denyMessage: 'Custom access denied message' }
            } as unknown as ActivatedRouteSnapshot;
            const mockState = { url: '/analytics' } as RouterStateSnapshot;

            billingServiceSpy.getCurrentSubscription.and.returnValue(of(null as any));

            const result = guard.canActivate(mockRoute, mockState);

            result.subscribe(accessAllowed => {
                expect(accessAllowed).toBe(false);
                expect(routerSpy.navigate).toHaveBeenCalledWith(['/billing']);

                // Check if message was stored for display
                expect(sessionStorage.getItem('subscriptionGuardMessage')).toBe('Custom access denied message');
                done();
            });
        });

        it('should handle API errors gracefully', (done) => {
            const mockRoute = {
                data: { requiresSubscription: true }
            } as unknown as ActivatedRouteSnapshot;
            const mockState = { url: '/analytics' } as RouterStateSnapshot;

            billingServiceSpy.getCurrentSubscription.and.returnValue(throwError(() => new Error('API Error')));

            const result = guard.canActivate(mockRoute, mockState);

            result.subscribe(accessAllowed => {
                expect(accessAllowed).toBe(false);
                expect(routerSpy.navigate).toHaveBeenCalledWith(['/billing']);
                done();
            });
        });
    });

    describe('validation methods', () => {
        beforeEach(() => {
            billingServiceSpy.getCurrentSubscription.and.returnValue(of(mockSubscription));
        });

        it('should identify active subscription', () => {
            expect(guard['isSubscriptionActive'](mockSubscription, true)).toBe(true);
        });

        it('should identify trial subscription', () => {
            const trialSubscription = {
                ...mockSubscription,
                status: 'trialing' as SubscriptionStatus,
                is_trialing: true
            };

            expect(guard['isSubscriptionActive'](trialSubscription, true)).toBe(true);
        });

        it('should identify expired subscription', () => {
            const expiredSubscription = {
                ...mockSubscription,
                status: 'expired' as SubscriptionStatus,
                is_expired: true
            };

            expect(guard['isSubscriptionActive'](expiredSubscription, false)).toBe(false);
        });

        it('should identify past due subscription', () => {
            const pastDueSubscription = {
                ...mockSubscription,
                status: 'past_due' as SubscriptionStatus,
                is_past_due: true
            };

            expect(guard['isSubscriptionActive'](pastDueSubscription, false)).toBe(false);
        });

        it('should identify canceled subscription within grace period', () => {
            const gracePeriodSubscription = {
                ...mockSubscription,
                status: 'canceled' as SubscriptionStatus,
                is_canceled: true,
                is_within_grace_period: true,
                ends_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
            };

            expect(guard['isSubscriptionActive'](gracePeriodSubscription, true)).toBe(true);
        });

        it('should identify canceled subscription outside grace period', () => {
            const canceledSubscription = {
                ...mockSubscription,
                status: 'canceled' as SubscriptionStatus,
                is_canceled: true,
                is_within_grace_period: false
            };

            expect(guard['isSubscriptionActive'](canceledSubscription, false)).toBe(false);
        });

        it('should check tier hierarchy correctly', () => {
            const basicSubscription = { ...mockSubscription, plan: mockBasicPlan };
            const proSubscription = { ...mockSubscription, plan: mockProPlan };

            expect(guard['meetsMinimumTier'](basicSubscription, 'basic')).toBe(true);
            expect(guard['meetsMinimumTier'](basicSubscription, 'pro')).toBe(false);
            expect(guard['meetsMinimumTier'](proSubscription, 'basic')).toBe(true);
            expect(guard['meetsMinimumTier'](proSubscription, 'enterprise')).toBe(true);
        });

        it('should check required features correctly', () => {
            expect(guard['hasRequiredFeatures'](mockSubscription, ['analytics'])).toBe(true);
            expect(guard['hasRequiredFeatures'](mockSubscription, ['nonexistent'])).toBe(false);
            expect(guard['hasRequiredFeatures'](mockSubscription, ['analytics', 'api_access'])).toBe(true);
        });
    });

    describe('error handling', () => {
        it('should handle missing plan gracefully', () => {
            const subscriptionWithoutPlan = {
                ...mockSubscription,
                plan: undefined
            };

            expect(guard['meetsMinimumTier'](subscriptionWithoutPlan, 'basic')).toBe(false);
        });

        it('should handle missing features gracefully', () => {
            const planWithoutFeatures = {
                ...mockSubscription.plan,
                features: undefined
            };

            expect(guard['hasRequiredFeatures'](mockSubscription, ['analytics'])).toBe(false);
        });
    });
});