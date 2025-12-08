import { TestBed } from '@angular/core/testing';
import { of, BehaviorSubject } from 'rxjs';

import { NotificationService, NotificationState, NotificationType } from './notification.service';
import { BillingService } from './billing.service';
import { ISubscription, IUsageStatistics, SubscriptionStatus } from '../models/subscription.model';
import { IPlan } from '../models/plan.model';

describe('NotificationService', () => {
    let service: NotificationService;
    let billingServiceSpy: jasmine.SpyObj<BillingService>;

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
            features: ['analytics', 'api_access'],
            limits: { max_users: 20, max_workspaces: 10 },
            is_popular: false,
            metadata: {},
            currency: 'USD',
            currency_symbol: '$',
            feature_highlights: ['Advanced features'],
            limit_highlights: ['20 users'],
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
        }
    };

    const mockTrialSubscription: ISubscription = {
        ...mockSubscription,
        status: 'trialing' as SubscriptionStatus,
        is_trialing: true,
        trial_ends_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        trial_days_remaining: 5
    };

    const mockPastDueSubscription: ISubscription = {
        ...mockSubscription,
        status: 'past_due' as SubscriptionStatus,
        is_past_due: true,
        ends_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        is_within_grace_period: true
    };

    const mockUsageStatistics: IUsageStatistics = {
        current_usage: {
            users: 25,
            workspaces: 12,
            boards: 55,
            storage_mb: 1200,
            api_calls_this_month: 12000
        },
        limits: {
            max_users: 20,
            max_workspaces: 10,
            max_boards: 50,
            max_storage_mb: 1000,
            max_api_calls_per_month: 10000
        },
        usage_percentage: {
            users: 125,
            workspaces: 120,
            boards: 110,
            storage_mb: 120,
            api_calls_this_month: 120
        },
        is_over_limit: {
            users: true,
            workspaces: true,
            boards: true,
            storage_mb: true,
            api_calls_this_month: true
        },
        remaining: {
            users: -5,
            workspaces: -2,
            boards: -5,
            storage_mb: -200,
            api_calls_this_month: -2000
        },
        last_calculated: '2024-01-01T00:00:00Z'
    };

    const mockPlans: IPlan[] = [
        {
            id: 1,
            name: 'Basic',
            slug: 'basic',
            price: '9',
            formatted_price: '$9',
            billing_interval: 'month',
            billing_interval_display: 'Monthly',
            trial_days: 14,
            features: ['basic_features'],
            limits: { max_users: 5, max_workspaces: 2 },
            is_popular: false,
            metadata: {},
            currency: 'USD',
            currency_symbol: '$',
            feature_highlights: ['Basic features'],
            limit_highlights: ['5 users'],
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
            billing_interval_display: 'Monthly',
            trial_days: 14,
            features: ['advanced_features'],
            limits: { max_users: 20, max_workspaces: 10 },
            is_popular: true,
            metadata: {},
            currency: 'USD',
            currency_symbol: '$',
            feature_highlights: ['Advanced features'],
            limit_highlights: ['20 users'],
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
        }
    ];

    beforeEach(() => {
        const billingSpy = jasmine.createSpyObj('BillingService', ['']);
        const subscriptionSubject = new BehaviorSubject<ISubscription | null>(mockSubscription);
        const loadingSubject = new BehaviorSubject<boolean>(false);

        billingSpy.currentSubscription$ = subscriptionSubject.asObservable();
        billingSpy.loading$ = loadingSubject.asObservable();

        // Store references for test manipulation
        (billingServiceSpy as any)._subscriptionSubject = subscriptionSubject;
        (billingServiceSpy as any)._loadingSubject = loadingSubject;

        TestBed.configureTestingModule({
            providers: [
                NotificationService,
                { provide: BillingService, useValue: billingSpy }
            ]
        });

        service = TestBed.inject(NotificationService);
        billingServiceSpy = TestBed.inject(BillingService) as jasmine.SpyObj<BillingService>;
    });

    afterEach(() => {
        sessionStorage.clear();
    });

    describe('Service initialization', () => {
        it('should be created', () => {
            expect(service).toBeTruthy();
        });

        it('should initialize with default state', () => {
            service.getCurrentNotificationState().subscribe(state => {
                expect(state.type).toBe('none');
                expect(state.isVisible).toBe(false);
                expect(state.isUrgent).toBe(false);
            });
        });

        it('should initialize and monitor subscription changes', () => {
            spyOn(service as any, 'monitorSubscriptionChanges');
            spyOn(service as any, 'evaluateNotificationState');

            service.initialize();

            expect(service['monitorSubscriptionChanges']).toHaveBeenCalled();
            expect(service['evaluateNotificationState']).toHaveBeenCalled();
        });
    });

    describe('Notification state management', () => {
        beforeEach(() => {
            service.initialize();
        });

        it('should provide observable for notification state', () => {
            expect(service.notificationState).toBeDefined();
            expect(typeof service.notificationState.subscribe).toBe('function');
        });

        it('should provide observable for specific notification types', () => {
            expect(service.showTrialBanner$).toBeDefined();
            expect(service.showPastDueBanner$).toBeDefined();
            expect(service.showUpgradePrompt$).toBeDefined();
            expect(service.hasActiveNotification$).toBeDefined();
        });

        it('should hide all notifications', () => {
            service.hideAllNotifications();

            service.getCurrentNotificationState().subscribe(state => {
                expect(state.type).toBe('none');
                expect(state.isVisible).toBe(false);
                expect(state.isUrgent).toBe(false);
            });
        });
    });

    describe('Trial notifications', () => {
        beforeEach(() => {
            service.initialize();
        });

        it('should show trial notification for active trial', () => {
            (billingServiceSpy as any)._subscriptionSubject.next(mockTrialSubscription);

            service.getCurrentNotificationState().subscribe(state => {
                expect(state.type).toBe('trial');
                expect(state.isVisible).toBe(true);
                expect(state.data?.trialDaysRemaining).toBe(5);
            });
        });

        it('should hide trial notification if dismissed', () => {
            sessionStorage.setItem('trial_banner_dismissed', 'true');
            (billingServiceSpy as any)._subscriptionSubject.next(mockTrialSubscription);

            service.getCurrentNotificationState().subscribe(state => {
                expect(state.type).toBe('none');
                expect(state.isVisible).toBe(false);
            });
        });

        it('should mark trial as urgent when 3 days or less remaining', () => {
            const urgentTrial = {
                ...mockTrialSubscription,
                trial_days_remaining: 2
            };
            (billingServiceSpy as any)._subscriptionSubject.next(urgentTrial);

            service.getCurrentNotificationState().subscribe(state => {
                expect(state.type).toBe('trial');
                expect(state.isUrgent).toBe(true);
            });
        });

        it('should generate appropriate trial messages', () => {
            const zeroDayTrial = {
                ...mockTrialSubscription,
                trial_days_remaining: 0
            };
            (billingServiceSpy as any)._subscriptionSubject.next(zeroDayTrial);

            service.getCurrentNotificationState().subscribe(state => {
                expect(state.message).toBe('Your trial expires today!');
            });
        });

        it('should hide trial banner', () => {
            (billingServiceSpy as any)._subscriptionSubject.next(mockTrialSubscription);
            service.hideTrialBanner();

            service.getCurrentNotificationState().subscribe(state => {
                expect(state.type).toBe('trial');
                expect(state.isVisible).toBe(false);
            });
        });
    });

    describe('Past due notifications', () => {
        beforeEach(() => {
            service.initialize();
        });

        it('should show past due notification for past due subscription', () => {
            (billingServiceSpy as any)._subscriptionSubject.next(mockPastDueSubscription);

            service.getCurrentNotificationState().subscribe(state => {
                expect(state.type).toBe('past_due');
                expect(state.isVisible).toBe(true);
                expect(state.data?.isWithinGracePeriod).toBe(true);
            });
        });

        it('should hide past due notification if dismissed', () => {
            sessionStorage.setItem('past_due_banner_dismissed', 'true');
            (billingServiceSpy as any)._subscriptionSubject.next(mockPastDueSubscription);

            service.getCurrentNotificationState().subscribe(state => {
                expect(state.type).toBe('none');
                expect(state.isVisible).toBe(false);
            });
        });

        it('should mark past due as urgent when 2 days or less remaining', () => {
            const urgentPastDue = {
                ...mockPastDueSubscription,
                ends_at: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString()
            };
            (billingServiceSpy as any)._subscriptionSubject.next(urgentPastDue);

            service.getCurrentNotificationState().subscribe(state => {
                expect(state.type).toBe('past_due');
                expect(state.isUrgent).toBe(true);
            });
        });

        it('should hide past due banner', () => {
            (billingServiceSpy as any)._subscriptionSubject.next(mockPastDueSubscription);
            service.hidePastDueBanner();

            service.getCurrentNotificationState().subscribe(state => {
                expect(state.type).toBe('past_due');
                expect(state.isVisible).toBe(false);
            });
        });
    });

    describe('Upgrade prompts', () => {
        beforeEach(() => {
            service.initialize();
        });

        it('should show upgrade prompt when over limits', () => {
            service.showUpgradePrompt(mockUsageStatistics, mockPlans);

            service.getCurrentNotificationState().subscribe(state => {
                expect(state.type).toBe('upgrade_prompt');
                expect(state.isVisible).toBe(true);
                expect(state.data?.overLimitFeatures.length).toBeGreaterThan(0);
            });
        });

        it('should hide upgrade prompt if dismissed', () => {
            sessionStorage.setItem('upgrade_prompt_dismissed', 'true');
            service.showUpgradePrompt(mockUsageStatistics, mockPlans);

            service.getCurrentNotificationState().subscribe(state => {
                expect(state.type).toBe('none');
                expect(state.isVisible).toBe(false);
            });
        });

        it('should hide upgrade prompt when not over limits', () => {
            const withinLimits = {
                ...mockUsageStatistics,
                is_over_limit: {
                    users: false,
                    workspaces: false,
                    boards: false,
                    storage_mb: false,
                    api_calls_this_month: false
                }
            };
            service.showUpgradePrompt(withinLimits, mockPlans);

            service.getCurrentNotificationState().subscribe(state => {
                expect(state.type).toBe('none');
                expect(state.isVisible).toBe(false);
            });
        });

        it('should hide upgrade prompt', () => {
            service.showUpgradePrompt(mockUsageStatistics, mockPlans);
            service.hideUpgradePrompt();

            service.getCurrentNotificationState().subscribe(state => {
                expect(state.type).toBe('upgrade_prompt');
                expect(state.isVisible).toBe(false);
            });
        });
    });

    describe('Notification dismissal', () => {
        beforeEach(() => {
            service.initialize();
        });

        it('should dismiss current notification', () => {
            (billingServiceSpy as any)._subscriptionSubject.next(mockTrialSubscription);
            service.dismissCurrentNotification();

            service.getCurrentNotificationState().subscribe(state => {
                expect(state.isVisible).toBe(false);
            });

            expect(sessionStorage.getItem('trial_banner_dismissed')).toBe('true');
        });

        it('should reset dismissal for specific notification type', () => {
            sessionStorage.setItem('trial_banner_dismissed', 'true');
            service.resetDismissal('trial');

            expect(sessionStorage.getItem('trial_banner_dismissed')).toBeNull();
        });

        it('should re-evaluate notification after reset', () => {
            sessionStorage.setItem('trial_banner_dismissed', 'true');
            (billingServiceSpy as any)._subscriptionSubject.next(mockTrialSubscription);

            service.resetDismissal('trial');

            service.getCurrentNotificationState().subscribe(state => {
                expect(state.type).toBe('trial');
                expect(state.isVisible).toBe(true);
            });
        });
    });

    describe('Notification state queries', () => {
        beforeEach(() => {
            service.initialize();
        });

        it('should check if notification type is active', () => {
            (billingServiceSpy as any)._subscriptionSubject.next(mockTrialSubscription);

            expect(service.isNotificationActive('trial')).toBe(true);
            expect(service.isNotificationActive('past_due')).toBe(false);
            expect(service.isNotificationActive('upgrade_prompt')).toBe(false);
        });

        it('should get current notification state', () => {
            const state = service.getCurrentNotificationState();
            expect(state).toBeDefined();
            expect(typeof state.subscribe).toBe('function');
        });
    });

    describe('Message generation', () => {
        beforeEach(() => {
            service.initialize();
        });

        it('should generate correct trial messages', () => {
            const oneDayTrial = {
                ...mockTrialSubscription,
                trial_days_remaining: 1
            };
            (billingServiceSpy as any)._subscriptionSubject.next(oneDayTrial);

            service.getCurrentNotificationState().subscribe(state => {
                expect(state.message).toBe('Your trial expires tomorrow!');
            });
        });

        it('should generate correct past due messages', () => {
            const oneDayPastDue = {
                ...mockPastDueSubscription,
                ends_at: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString()
            };
            (billingServiceSpy as any)._subscriptionSubject.next(oneDayPastDue);

            service.getCurrentNotificationState().subscribe(state => {
                expect(state.message).toBe('Your grace period expires tomorrow! Update your payment method now.');
            });
        });

        it('should generate correct upgrade messages', () => {
            service.showUpgradePrompt(mockUsageStatistics, mockPlans);

            service.getCurrentNotificationState().subscribe(state => {
                expect(state.message).toContain('You\'ve exceeded multiple plan limits');
            });
        });
    });

    describe('Error handling', () => {
        beforeEach(() => {
            service.initialize();
        });

        it('should handle sessionStorage errors gracefully', () => {
            spyOn(sessionStorage, 'setItem').and.throwError('Storage error');
            spyOn(console, 'warn');

            service.dismissCurrentNotification();

            expect(console.warn).toHaveBeenCalledWith('Failed to save notification dismissal:', jasmine.any(Error));
        });

        it('should handle missing subscription', () => {
            (billingServiceSpy as any)._subscriptionSubject.next(null);

            service.getCurrentNotificationState().subscribe(state => {
                expect(state.type).toBe('none');
                expect(state.isVisible).toBe(false);
            });
        });

        it('should handle missing ends_at date', () => {
            const noEndDate = {
                ...mockPastDueSubscription,
                ends_at: undefined
            };
            (billingServiceSpy as any)._subscriptionSubject.next(noEndDate);

            service.getCurrentNotificationState().subscribe(state => {
                expect(state.type).toBe('past_due');
                expect(state.data?.daysRemaining).toBe(0);
            });
        });
    });

    describe('Feature name formatting', () => {
        beforeEach(() => {
            service.initialize();
        });

        it('should format feature names correctly', () => {
            service.showUpgradePrompt(mockUsageStatistics, mockPlans);

            service.getCurrentNotificationState().subscribe(state => {
                const features = state.data?.overLimitFeatures || [];
                expect(features).toContain('Users');
                expect(features).toContain('Workspaces');
                expect(features).toContain('Boards');
            });
        });
    });
});