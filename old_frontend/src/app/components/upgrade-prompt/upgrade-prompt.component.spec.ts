import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { of } from 'rxjs';

import { UpgradePromptComponent } from './upgrade-prompt.component';
import { BillingService } from '../../services/billing.service';
import { ISubscription, IUsageStatistics } from '../../models/subscription.model';
import { IPlan as IPlanModel } from '../../models/plan.model';

describe('UpgradePromptComponent', () => {
    let component: UpgradePromptComponent;
    let fixture: ComponentFixture<UpgradePromptComponent>;
    let billingServiceSpy: jasmine.SpyObj<BillingService>;
    let routerSpy: jasmine.SpyObj<Router>;

    const mockSubscription: ISubscription = {
        id: 1,
        tenant_id: 1,
        plan_id: 1,
        stripe_subscription_id: 'sub_123',
        status: 'active',
        status_display: 'Active',
        trial_ends_at: undefined,
        ends_at: undefined,
        current_period_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        cancel_at_period_end: false,
        is_trialing: false,
        is_active: true,
        is_past_due: false,
        is_canceled: false,
        is_expired: false,
        is_within_grace_period: false,
        trial_days_remaining: 0,
        days_remaining: 30,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        plan: {
            id: 1,
            name: 'Starter',
            slug: 'starter',
            price: '19',
            formatted_price: '$19',
            billing_interval: 'month',
            billing_interval_display: 'Monthly',
            trial_days: 14,
            features: ['feature1', 'feature2'],
            limits: { max_users: 3, max_workspaces: 2 },
            is_popular: false,
            metadata: {},
            currency: 'USD',
            currency_symbol: '$',
            feature_highlights: ['Basic features', 'Email support'],
            limit_highlights: ['3 users', '2 workspaces'],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }
    };

    const mockUsageStatistics: IUsageStatistics = {
        current_usage: {
            users: 4,
            workspaces: 3,
            boards: 15
        },
        limits: {
            max_users: 3,
            max_workspaces: 2,
            max_boards: 10
        },
        usage_percentage: {
            users: 133,
            workspaces: 150,
            boards: 150
        },
        is_over_limit: {
            users: true,
            workspaces: true,
            boards: true
        },
        remaining: {
            users: -1,
            workspaces: -1,
            boards: -5
        },
        last_calculated: new Date().toISOString()
    };

    const mockPlans: IPlanModel[] = [
        {
            id: 1,
            name: 'Starter',
            slug: 'starter',
            price: '19',
            formatted_price: '$19',
            billing_interval: 'month',
            billing_interval_display: 'Monthly',
            trial_days: 14,
            features: ['feature1', 'feature2'],
            limits: { max_users: 3, max_workspaces: 2 },
            is_popular: false,
            metadata: {},
            currency: 'USD',
            currency_symbol: '$',
            feature_highlights: ['Basic features', 'Email support'],
            limit_highlights: ['3 users', '2 workspaces'],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
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
            features: ['feature1', 'feature2', 'feature3'],
            limits: { max_users: 10, max_workspaces: 5 },
            is_popular: true,
            metadata: {},
            currency: 'USD',
            currency_symbol: '$',
            feature_highlights: ['Advanced features', 'Priority support', 'Advanced analytics'],
            limit_highlights: ['10 users', '5 workspaces'],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        },
        {
            id: 3,
            name: 'Business',
            slug: 'business',
            price: '49',
            formatted_price: '$49',
            billing_interval: 'month',
            billing_interval_display: 'Monthly',
            trial_days: 14,
            features: ['feature1', 'feature2', 'feature3', 'feature4'],
            limits: { max_users: 25, max_workspaces: 15 },
            is_popular: false,
            metadata: {},
            currency: 'USD',
            currency_symbol: '$',
            feature_highlights: ['Premium features', 'Dedicated support', 'Custom integrations'],
            limit_highlights: ['25 users', '15 workspaces'],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }
    ];

    beforeEach(waitForAsync(() => {
        const billingSpy = jasmine.createSpyObj('BillingService', ['getCurrentSubscription']);
        const routerSpyObj = jasmine.createSpyObj('Router', ['navigate']);

        TestBed.configureTestingModule({
            imports: [
                CommonModule,
                UpgradePromptComponent
            ],
            providers: [
                { provide: BillingService, useValue: billingSpy },
                { provide: Router, useValue: routerSpyObj }
            ]
        }).compileComponents();

        billingServiceSpy = TestBed.inject(BillingService) as jasmine.SpyObj<BillingService>;
        routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(UpgradePromptComponent);
        component = fixture.componentInstance;
        component.currentSubscription = mockSubscription;
        component.usageStatistics = mockUsageStatistics;
        component.availablePlans = mockPlans;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize with default values', () => {
        expect(component.isVisible).toBe(true);
        expect(component.isUrgent).toBe(false);
        expect(component.showUpgradeButton).toBe(true);
        expect(component.autoHide).toBe(true);
        expect(component.thresholdPercentage).toBe(80);
    });

    describe('ngOnInit', () => {
        it('should initialize prompt and check dismissal', () => {
            component.ngOnInit();

            // Verify that component is properly initialized
            expect(component).toBeTruthy();
        });
    });

    describe('initializePrompt', () => {
        it('should hide prompt if previously dismissed', () => {
            sessionStorage.setItem('upgrade_prompt_dismissed', 'true');

            component['initializePrompt']();

            expect(component.isVisible).toBe(false);
        });

        it('should show prompt and update upgrade info if not dismissed', () => {
            sessionStorage.removeItem('upgrade_prompt_dismissed');

            component['initializePrompt']();

            expect(component.isVisible).toBe(true);
        });

        it('should auto-hide if no usage statistics', () => {
            component.usageStatistics = null;
            sessionStorage.removeItem('upgrade_prompt_dismissed');

            component['initializePrompt']();

            expect(component.isVisible).toBe(false);
        });

        it('should auto-hide if no subscription', () => {
            component.currentSubscription = null;
            sessionStorage.removeItem('upgrade_prompt_dismissed');

            component['initializePrompt']();

            expect(component.isVisible).toBe(false);
        });
    });

    describe('updateUpgradeInfo', () => {
        it('should hide prompt if no usage statistics', () => {
            component.usageStatistics = null;

            component['updateUpgradeInfo']();

            expect(component.isVisible).toBe(false);
        });

        it('should hide prompt if no available plans', () => {
            component.availablePlans = [];

            component['updateUpgradeInfo']();

            expect(component.isVisible).toBe(false);
        });

        it('should hide prompt if not over any limits', () => {
            component.usageStatistics = {
                ...mockUsageStatistics,
                is_over_limit: {
                    users: false,
                    workspaces: false,
                    boards: false
                }
            };

            component['updateUpgradeInfo']();

            expect(component.isVisible).toBe(false);
        });

        it('should set urgent when multiple features over limit', () => {
            component['updateUpgradeInfo']();

            expect(component.isUrgent).toBe(true);
        });

        it('should set urgent when usage percentage is high', () => {
            component.usageStatistics = {
                ...mockUsageStatistics,
                usage_percentage: {
                    users: 95,
                    workspaces: 80,
                    boards: 75
                }
            };

            component['updateUpgradeInfo']();

            expect(component.isUrgent).toBe(true);
        });

        it('should find recommended plan', () => {
            component['updateUpgradeInfo']();

            expect(component.recommendedPlan).toBeTruthy();
            expect(component.recommendedPlan?.name).toBe('Professional');
        });
    });

    describe('getOverLimitFeatures', () => {
        it('should return empty array when not over any limits', () => {
            component.usageStatistics = {
                ...mockUsageStatistics,
                is_over_limit: {
                    users: false,
                    workspaces: false,
                    boards: false
                }
            };

            const result = component['getOverLimitFeatures']();

            expect(result).toEqual([]);
        });

        it('should return formatted feature names when over limits', () => {
            component.usageStatistics = mockUsageStatistics;

            const result = component['getOverLimitFeatures']();

            expect(result).toEqual(['Users', 'Workspaces', 'Boards']);
        });
    });

    describe('getMaxUsagePercentage', () => {
        it('should return 0 when no usage statistics', () => {
            component.usageStatistics = null;

            const result = component['getMaxUsagePercentage']();

            expect(result).toBe(0);
        });

        it('should return maximum percentage from usage statistics', () => {
            component.usageStatistics = mockUsageStatistics;

            const result = component['getMaxUsagePercentage']();

            expect(result).toBe(150);
        });
    });

    describe('findRecommendedPlan', () => {
        it('should return null if no current subscription', () => {
            component.currentSubscription = null;

            const result = component['findRecommendedPlan']();

            expect(result).toBeNull();
        });

        it('should return null if current plan not found', () => {
            component.currentSubscription = { ...mockSubscription, plan_id: 999 };

            const result = component['findRecommendedPlan']();

            expect(result).toBeNull();
        });

        it('should return next higher plan if available', () => {
            component.currentSubscription = mockSubscription;

            const result = component['findRecommendedPlan']();

            expect(result?.name).toBe('Professional');
        });

        it('should return best fit plan if no higher plans available', () => {
            component.currentSubscription = { ...mockSubscription, plan_id: 3 }; // Business plan
            component.usageStatistics = {
                ...mockUsageStatistics,
                current_usage: {
                    users: 30,
                    workspaces: 20,
                    boards: 25
                }
            };

            const result = component['findRecommendedPlan']();

            expect(result?.name).toBe('Business');
        });
    });

    describe('planAccommodatesUsage', () => {
        it('should return true when plan has unlimited limits', () => {
            const plan = mockPlans[2]; // Business plan
            const usage = { users: 100, workspaces: 50 };

            const result = component['planAccommodatesUsage'](plan, usage);

            expect(result).toBe(true);
        });

        it('should return true when usage is within limits', () => {
            const plan = mockPlans[1]; // Professional plan
            const usage = { users: 5, workspaces: 3 };

            const result = component['planAccommodatesUsage'](plan, usage);

            expect(result).toBe(true);
        });

        it('should return false when usage exceeds limits', () => {
            const plan = mockPlans[0]; // Starter plan
            const usage = { users: 5, workspaces: 3 };

            const result = component['planAccommodatesUsage'](plan, usage);

            expect(result).toBe(false);
        });
    });

    describe('onUpgradeClick', () => {
        it('should emit upgrade event and navigate to pricing', () => {
            spyOn(component.onUpgrade, 'emit');

            component.onUpgradeClick(mockPlans[1]);

            expect(component.onUpgrade.emit).toHaveBeenCalledWith(mockPlans[1]);
            expect(routerSpy.navigate).toHaveBeenCalledWith(['/pricing'], {
                queryParams: {
                    plan: 'professional',
                    upgrade: 'true'
                }
            });
        });

        it('should do nothing if no plan provided', () => {
            spyOn(component.onUpgrade, 'emit');

            component.onUpgradeClick();

            expect(component.onUpgrade.emit).not.toHaveBeenCalled();
        });
    });

    describe('onDismissClick', () => {
        it('should hide prompt, save dismissal state, and emit dismiss event', () => {
            spyOn(sessionStorage, 'setItem');
            spyOn(component.onDismiss, 'emit');
            component.isVisible = true;

            component.onDismissClick();

            expect(component.isVisible).toBe(false);
            expect(sessionStorage.setItem).toHaveBeenCalledWith('upgrade_prompt_dismissed', 'true');
            expect(component.onDismiss.emit).toHaveBeenCalled();
        });
    });

    describe('getUrgencyClass', () => {
        it('should return upgrade-prompt-normal when not urgent', () => {
            component.isUrgent = false;

            expect(component.getUrgencyClass()).toBe('upgrade-prompt-normal');
        });

        it('should return upgrade-prompt-urgent when urgent', () => {
            component.isUrgent = true;

            expect(component.getUrgencyClass()).toBe('upgrade-prompt-urgent');
        });
    });

    describe('getPromptTitle', () => {
        it('should return urgent title when urgent', () => {
            component.isUrgent = true;

            expect(component.getPromptTitle()).toBe('🚨 Plan Limits Exceeded');
        });

        it('should return normal title when not urgent', () => {
            component.isUrgent = false;

            expect(component.getPromptTitle()).toBe('💡 Upgrade Recommended');
        });
    });

    describe('getPromptMessage', () => {
        it('should return approaching limits message when not over limits', () => {
            component.overLimitFeatures = [];

            expect(component.getPromptMessage()).toBe('You\'re approaching your plan limits.');
        });

        it('should return single limit message when one feature over limit', () => {
            component.overLimitFeatures = ['Users'];

            expect(component.getPromptMessage()).toBe('You\'ve reached your Users limit.');
        });

        it('should return multiple limits message when few features over limit', () => {
            component.overLimitFeatures = ['Users', 'Workspaces'];

            expect(component.getPromptMessage()).toBe('You\'ve reached limits for: Users, Workspaces.');
        });

        it('should return multiple limits exceeded message when many features over limit', () => {
            component.overLimitFeatures = ['Users', 'Workspaces', 'Boards', 'Storage'];

            expect(component.getPromptMessage()).toBe('You\'ve exceeded multiple plan limits. Upgrade to continue.');
        });
    });

    describe('getUsagePercentage', () => {
        it('should return 0 when no usage statistics', () => {
            component.usageStatistics = null;

            expect(component.getUsagePercentage('users')).toBe(0);
        });

        it('should return usage percentage for feature', () => {
            component.usageStatistics = mockUsageStatistics;

            expect(component.getUsagePercentage('users')).toBe(133);
            expect(component.getUsagePercentage('workspaces')).toBe(150);
        });
    });

    describe('getProgressColor', () => {
        it('should return progress-success for low usage', () => {
            expect(component.getProgressColor(50)).toBe('progress-success');
        });

        it('should return progress-caution for medium usage', () => {
            expect(component.getProgressColor(80)).toBe('progress-caution');
        });

        it('should return progress-warning for high usage', () => {
            expect(component.getProgressColor(90)).toBe('progress-warning');
        });

        it('should return progress-danger for over usage', () => {
            expect(component.getProgressColor(100)).toBe('progress-danger');
        });
    });

    describe('shouldShow', () => {
        it('should return true when prompt should be visible', () => {
            component.isVisible = true;
            component.overLimitFeatures = ['Users'];
            component.currentSubscription = mockSubscription;
            component.availablePlans = mockPlans;

            expect(component.shouldShow()).toBe(true);
        });

        it('should return false when not visible', () => {
            component.isVisible = false;
            component.overLimitFeatures = ['Users'];
            component.currentSubscription = mockSubscription;
            component.availablePlans = mockPlans;

            expect(component.shouldShow()).toBe(false);
        });

        it('should return false when no features over limit', () => {
            component.isVisible = true;
            component.overLimitFeatures = [];
            component.currentSubscription = mockSubscription;
            component.availablePlans = mockPlans;

            expect(component.shouldShow()).toBe(false);
        });

        it('should return false when no subscription', () => {
            component.isVisible = true;
            component.overLimitFeatures = ['Users'];
            component.currentSubscription = null;
            component.availablePlans = mockPlans;

            expect(component.shouldShow()).toBe(false);
        });

        it('should return false when no available plans', () => {
            component.isVisible = true;
            component.overLimitFeatures = ['Users'];
            component.currentSubscription = mockSubscription;
            component.availablePlans = [];

            expect(component.shouldShow()).toBe(false);
        });
    });

    describe('resetDismissal', () => {
        it('should reset dismissal state and show prompt', () => {
            spyOn(sessionStorage, 'removeItem');
            component.isVisible = false;

            component.resetDismissal();

            expect(sessionStorage.removeItem).toHaveBeenCalledWith('upgrade_prompt_dismissed');
            expect(component.isVisible).toBe(true);
        });
    });

    describe('getUpgradeButtonText', () => {
        it('should return default text when no plan', () => {
            component.recommendedPlan = null;

            expect(component.getUpgradeButtonText()).toBe('Upgrade Plan');
        });

        it('should return upgrade text when plan is more expensive', () => {
            component.recommendedPlan = mockPlans[1]; // Professional
            component.currentSubscription = mockSubscription; // Starter

            expect(component.getUpgradeButtonText()).toBe('Upgrade to Professional');
        });

        it('should return change text when plan is same price', () => {
            component.recommendedPlan = { ...mockPlans[1], price: '19' }; // Same price as Starter
            component.currentSubscription = mockSubscription;

            expect(component.getUpgradeButtonText()).toBe('Change to Professional');
        });
    });

    describe('getPlanComparisonText', () => {
        it('should return price increase when plan is more expensive', () => {
            const plan = mockPlans[1]; // Professional
            component.currentSubscription = mockSubscription; // Starter

            expect(component.getPlanComparisonText(plan)).toBe('+$10.00/month');
        });

        it('should return savings when plan is cheaper', () => {
            const plan = { ...mockPlans[0], price: '9' }; // Cheaper than Professional
            // Create a mock subscription for Professional plan to test comparison
            const professionalSubscription: ISubscription = {
                ...mockSubscription,
                plan_id: 2,
                plan: mockPlans[1] // Professional plan
            };
            component.currentSubscription = professionalSubscription;

            expect(component.getPlanComparisonText(plan)).toBe('$20.00/month savings');
        });

        it('should return same price when plans cost the same', () => {
            const plan = { ...mockPlans[1], price: '19' }; // Same as Starter
            component.currentSubscription = mockSubscription; // Starter

            expect(component.getPlanComparisonText(plan)).toBe('Same price');
        });
    });

    describe('getPlanHighlights', () => {
        it('should return top 3 feature highlights', () => {
            const plan = mockPlans[2]; // Business plan with 4 features

            const result = component.getPlanHighlights(plan);

            expect(result).toEqual(['Premium features', 'Dedicated support', 'Custom integrations']);
        });

        it('should return all features if less than 3', () => {
            const plan = { ...mockPlans[0], feature_highlights: ['Basic features'] }; // Only 1 feature

            const result = component.getPlanHighlights(plan);

            expect(result).toEqual(['Basic features']);
        });
    });

    describe('ngOnDestroy', () => {
        it('should complete destroy subject', () => {
            const nextSpy = spyOn(component['destroy$'], 'next');
            const completeSpy = spyOn(component['destroy$'], 'complete');

            component.ngOnDestroy();

            expect(nextSpy).toHaveBeenCalled();
            expect(completeSpy).toHaveBeenCalled();
        });
    });
});