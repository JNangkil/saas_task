import { Component, TemplateRef, ViewContainerRef, ChangeDetectorRef } from '@angular/core';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { of, BehaviorSubject, throwError } from 'rxjs';

import { IfPlanHasDirective, PlanFeatureCheck, IfPlanHasOptions } from './if-plan-has.directive';
import { BillingService } from '../services/billing.service';
import { ISubscription, IUsageStatistics, SubscriptionStatus } from '../models/subscription.model';
import { IPlan, IPlanLimits } from '../models/plan.model';

@Component({
    template: `
        <div *ifPlanHas="'analytics'">Analytics Content</div>
        <div *ifPlanHas="'analytics'; else noAnalytics">Analytics Content</div>
        <ng-template #noAnalytics>No Analytics</ng-template>
        <div *ifPlanHas="{ minUsers: 10 }">Team Content</div>
        <div *ifPlanHas="['analytics', { minUsers: 5 }]">Multiple Checks</div>
        <div *ifPlanHas="'premium'; options: { showLoading: true }">Premium Content</div>
    `
})
class TestComponent { }

describe('IfPlanHasDirective', () => {
    let component: TestComponent;
    let fixture: ComponentFixture<TestComponent>;
    let billingServiceSpy: jasmine.SpyObj<BillingService>;
    let templateRefSpy: jasmine.SpyObj<TemplateRef<any>>;
    let viewContainerRefSpy: jasmine.SpyObj<ViewContainerRef>;
    let cdrSpy: jasmine.SpyObj<ChangeDetectorRef>;
    let directive: IfPlanHasDirective;

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
            features: ['analytics', 'api_access', 'advanced_features'],
            limits: {
                max_users: 20,
                max_workspaces: 10,
                max_boards: 50,
                max_storage_mb: 1000,
                max_api_calls_per_month: 10000
            },
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
        id: 2,
        name: 'Basic',
        slug: 'basic',
        price: '9',
        formatted_price: '$9',
        billing_interval: 'month',
        billing_interval_display: 'Monthly',
        trial_days: 14,
        features: ['basic_features'],
        limits: {
            max_users: 5,
            max_workspaces: 2,
            max_boards: 10,
            max_storage_mb: 100,
            max_api_calls_per_month: 1000
        },
        is_popular: false,
        metadata: {},
        currency: 'USD',
        currency_symbol: '$',
        feature_highlights: ['Basic features'],
        limit_highlights: ['5 users', '2 workspaces'],
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
    };

    const mockUsageStatistics: IUsageStatistics = {
        current_usage: {
            users: 3,
            workspaces: 1,
            boards: 5,
            storage_mb: 50,
            api_calls_this_month: 500
        },
        limits: {
            max_users: 20,
            max_workspaces: 10,
            max_boards: 50,
            max_storage_mb: 1000,
            max_api_calls_per_month: 10000
        },
        usage_percentage: {
            users: 15,
            workspaces: 10,
            boards: 10,
            storage_mb: 5,
            api_calls_this_month: 5
        },
        is_over_limit: {
            users: false,
            workspaces: false,
            boards: false,
            storage_mb: false,
            api_calls_this_month: false
        },
        remaining: {
            users: 17,
            workspaces: 9,
            boards: 45,
            storage_mb: 950,
            api_calls_this_month: 9500
        },
        last_calculated: '2024-01-01T00:00:00Z'
    };

    beforeEach(() => {
        const billingSpy = jasmine.createSpyObj('BillingService', ['getCurrentSubscription', 'getUsageStatistics']);
        const templateRefSpyObj = jasmine.createSpyObj('TemplateRef', ['']);
        const viewContainerRefSpyObj = jasmine.createSpyObj('ViewContainerRef', ['clear', 'createEmbeddedView']);
        const cdrSpyObj = jasmine.createSpyObj('ChangeDetectorRef', ['markForCheck']);

        TestBed.configureTestingModule({
            declarations: [TestComponent, IfPlanHasDirective],
            providers: [
                { provide: BillingService, useValue: billingSpy },
                { provide: TemplateRef, useValue: templateRefSpyObj },
                { provide: ViewContainerRef, useValue: viewContainerRefSpyObj },
                { provide: ChangeDetectorRef, useValue: cdrSpyObj }
            ]
        });

        fixture = TestBed.createComponent(TestComponent);
        component = fixture.componentInstance;
        billingServiceSpy = TestBed.inject(BillingService) as jasmine.SpyObj<BillingService>;
        templateRefSpy = TestBed.inject(TemplateRef) as jasmine.SpyObj<TemplateRef<any>>;
        viewContainerRefSpy = TestBed.inject(ViewContainerRef) as jasmine.SpyObj<ViewContainerRef>;
        cdrSpy = TestBed.inject(ChangeDetectorRef) as jasmine.SpyObj<ChangeDetectorRef>;

        // Setup default service behavior
        billingServiceSpy.currentSubscription$ = new BehaviorSubject<ISubscription | null>(mockSubscription);
        billingServiceSpy.loading$ = new BehaviorSubject<boolean>(false);
        billingServiceSpy.getCurrentSubscription.and.returnValue(of(mockSubscription));
        billingServiceSpy.getUsageStatistics.and.returnValue(of(mockUsageStatistics));

        // Create directive instance for direct testing
        directive = new IfPlanHasDirective(
            templateRefSpy,
            viewContainerRefSpy,
            billingServiceSpy,
            cdrSpy
        );
    });

    describe('Directive initialization', () => {
        it('should create directive', () => {
            expect(directive).toBeTruthy();
        });

        it('should initialize with default values', () => {
            expect(directive['hasView']).toBe(false);
            expect(directive['loadingView']).toBe(false);
            expect(directive['currentSubscription']).toBeNull();
            expect(directive['currentUsage']).toBeNull();
        });

        it('should set up subscription tracking on init', () => {
            spyOn(directive as any, 'initializeSubscriptionTracking');
            directive.ngOnInit();
            expect(directive['initializeSubscriptionTracking']).toHaveBeenCalled();
        });

        it('should clean up on destroy', () => {
            spyOn(directive['destroy$'], 'next');
            spyOn(directive['destroy$'], 'complete');
            directive.ngOnDestroy();
            expect(directive['destroy$'].next).toHaveBeenCalled();
            expect(directive['destroy$'].complete).toHaveBeenCalled();
        });
    });

    describe('Feature checks', () => {
        beforeEach(() => {
            directive['currentSubscription'] = mockSubscription;
        });

        it('should show content when feature is available', () => {
            directive.ifPlanHas = 'analytics';
            directive.ngOnInit();

            expect(directive['checkPlanCondition']()).toBe(true);
        });

        it('should hide content when feature is not available', () => {
            directive.ifPlanHas = 'nonexistent_feature';
            directive.ngOnInit();

            expect(directive['checkPlanCondition']()).toBe(false);
        });

        it('should handle multiple feature checks with AND logic', () => {
            directive.ifPlanHas = ['analytics', 'api_access'];
            directive.ngOnInit();

            expect(directive['checkPlanCondition']()).toBe(true);
        });

        it('should fail when any feature in array is missing', () => {
            directive.ifPlanHas = ['analytics', 'nonexistent_feature'];
            directive.ngOnInit();

            expect(directive['checkPlanCondition']()).toBe(false);
        });
    });

    describe('Limit checks', () => {
        beforeEach(() => {
            directive['currentSubscription'] = mockSubscription;
        });

        it('should check minimum users correctly', () => {
            directive.ifPlanHas = { minUsers: 10 };
            directive.ngOnInit();

            expect(directive['checkPlanCondition']()).toBe(true);
        });

        it('should fail when users limit is insufficient', () => {
            directive.ifPlanHas = { minUsers: 25 };
            directive.ngOnInit();

            expect(directive['checkPlanCondition']()).toBe(false);
        });

        it('should check minimum workspaces correctly', () => {
            directive.ifPlanHas = { minWorkspaces: 5 };
            directive.ngOnInit();

            expect(directive['checkPlanCondition']()).toBe(true);
        });

        it('should check minimum boards correctly', () => {
            directive.ifPlanHas = { minBoards: 25 };
            directive.ngOnInit();

            expect(directive['checkPlanCondition']()).toBe(true);
        });

        it('should check minimum storage correctly', () => {
            directive.ifPlanHas = { minStorage: 500 };
            directive.ngOnInit();

            expect(directive['checkPlanCondition']()).toBe(true);
        });

        it('should check minimum API calls correctly', () => {
            directive.ifPlanHas = { minApiCalls: 5000 };
            directive.ngOnInit();

            expect(directive['checkPlanCondition']()).toBe(true);
        });
    });

    describe('Tier checks', () => {
        beforeEach(() => {
            directive['currentSubscription'] = mockSubscription;
        });

        it('should check tier correctly', () => {
            directive.ifPlanHas = { tier: 'pro' };
            directive.ngOnInit();

            expect(directive['checkPlanCondition']()).toBe(true);
        });

        it('should fail when tier is too low', () => {
            directive.ifPlanHas = { tier: 'enterprise' };
            directive.ngOnInit();

            expect(directive['checkPlanCondition']()).toBe(false);
        });

        it('should handle tier hierarchy correctly', () => {
            // Test with basic plan
            const basicSubscription = { ...mockSubscription, plan: mockBasicPlan };
            directive['currentSubscription'] = basicSubscription;

            directive.ifPlanHas = { tier: 'basic' };
            expect(directive['checkPlanCondition']()).toBe(true);

            directive.ifPlanHas = { tier: 'pro' };
            expect(directive['checkPlanCondition']()).toBe(false);
        });
    });

    describe('Custom limit checks', () => {
        beforeEach(() => {
            directive['currentSubscription'] = mockSubscription;
        });

        it('should check custom limit correctly', () => {
            directive.ifPlanHas = { customLimit: { name: 'max_users', value: 15 } };
            directive.ngOnInit();

            expect(directive['checkPlanCondition']()).toBe(true);
        });

        it('should fail when custom limit is insufficient', () => {
            directive.ifPlanHas = { customLimit: { name: 'max_users', value: 25 } };
            directive.ngOnInit();

            expect(directive['checkPlanCondition']()).toBe(false);
        });

        it('should handle non-existent custom limit', () => {
            directive.ifPlanHas = { customLimit: { name: 'nonexistent_limit', value: 1 } };
            directive.ngOnInit();

            expect(directive['checkPlanCondition']()).toBe(false);
        });
    });

    describe('View management', () => {
        beforeEach(() => {
            directive['currentSubscription'] = mockSubscription;
        });

        it('should show view when condition is met', () => {
            directive.ifPlanHas = 'analytics';
            directive.ngOnInit();

            spyOn(directive as any, 'updateView');
            directive['evaluateCondition']();

            expect(directive['updateView']).toHaveBeenCalledWith(true);
        });

        it('should hide view when condition is not met', () => {
            directive.ifPlanHas = 'nonexistent_feature';
            directive.ngOnInit();

            spyOn(directive as any, 'updateView');
            directive['evaluateCondition']();

            expect(directive['updateView']).toHaveBeenCalledWith(false);
        });

        it('should handle else template', () => {
            const elseTemplate = {} as TemplateRef<any>;
            directive.ifPlanHas = 'nonexistent_feature';
            directive.ifPlanHasElse = elseTemplate;
            directive.ngOnInit();

            spyOn(directive as any, 'updateView');
            directive['evaluateCondition']();

            expect(directive['updateView']).toHaveBeenCalledWith(false);
            expect(directive.ifPlanHasElse).toBe(elseTemplate);
        });

        it('should show loading template when configured', () => {
            const loadingTemplate = {} as TemplateRef<any>;
            directive.ifPlanHas = 'analytics';
            directive.ifPlanHasOptions = { showLoading: true, loadingTemplate };
            directive.ngOnInit();

            (billingServiceSpy.loading$ as BehaviorSubject<boolean>).next(true);

            spyOn(directive as any, 'showLoadingView');
            directive['evaluateCondition']();

            expect(directive['showLoadingView']).toHaveBeenCalled();
        });
    });

    describe('Error handling', () => {
        it('should handle missing subscription gracefully', () => {
            directive['currentSubscription'] = null;
            directive.ifPlanHas = 'analytics';
            directive.ngOnInit();

            expect(directive['checkPlanCondition']()).toBe(false);
        });

        it('should handle missing plan gracefully', () => {
            directive['currentSubscription'] = { ...mockSubscription, plan: undefined };
            directive.ifPlanHas = 'analytics';
            directive.ngOnInit();

            expect(directive['checkPlanCondition']()).toBe(false);
        });

        it('should handle API errors gracefully', () => {
            billingServiceSpy.getCurrentSubscription.and.returnValue(throwError(() => new Error('API Error')));
            billingServiceSpy.getUsageStatistics.and.returnValue(throwError(() => new Error('API Error')));

            directive.ngOnInit();

            // Should not throw and should handle gracefully
            expect(directive).toBeTruthy();
        });
    });

    describe('Edge cases', () => {
        beforeEach(() => {
            directive['currentSubscription'] = mockSubscription;
        });

        it('should handle empty feature check array', () => {
            directive.ifPlanHas = [];
            directive.ngOnInit();

            expect(directive['checkPlanCondition']()).toBe(true);
        });

        it('should handle null check', () => {
            directive.ifPlanHas = null as any;
            directive.ngOnInit();

            expect(directive['checkPlanCondition']()).toBe(false);
        });

        it('should handle undefined check', () => {
            directive.ifPlanHas = undefined as any;
            directive.ngOnInit();

            expect(directive['checkPlanCondition']()).toBe(false);
        });

        it('should handle invalid check object', () => {
            directive.ifPlanHas = { invalidProperty: 'value' } as any;
            directive.ngOnInit();

            expect(directive['checkPlanCondition']()).toBe(false);
        });

        it('should handle unlimited limits (-1)', () => {
            const unlimitedPlan: IPlan = {
                ...mockSubscription.plan!,
                limits: { max_users: -1 }
            };
            directive['currentSubscription'] = { ...mockSubscription, plan: unlimitedPlan };

            directive.ifPlanHas = { minUsers: 1000 };
            directive.ngOnInit();

            expect(directive['checkPlanCondition']()).toBe(true);
        });

        it('should handle missing limits', () => {
            const noLimitsPlan: IPlan = {
                ...mockSubscription.plan!,
                limits: {} as IPlanLimits
            };
            directive['currentSubscription'] = { ...mockSubscription, plan: noLimitsPlan };

            directive.ifPlanHas = { minUsers: 1 };
            directive.ngOnInit();

            expect(directive['checkPlanCondition']()).toBe(false);
        });
    });

    describe('Integration with BillingService', () => {
        it('should fetch subscription when not cached', () => {
            billingServiceSpy.currentSubscription$ = new BehaviorSubject<ISubscription | null>(null);

            directive.ngOnInit();

            expect(billingServiceSpy.getCurrentSubscription).toHaveBeenCalled();
        });

        it('should track subscription changes', () => {
            const subscription$ = new BehaviorSubject<ISubscription | null>(mockSubscription);
            billingServiceSpy.currentSubscription$ = subscription$;

            spyOn(directive as any, 'evaluateCondition');
            directive.ngOnInit();

            const newSubscription = { ...mockSubscription, status: 'canceled' as SubscriptionStatus };
            subscription$.next(newSubscription);

            expect(directive['evaluateCondition']).toHaveBeenCalled();
        });

        it('should track loading state', () => {
            const loading$ = new BehaviorSubject<boolean>(false);
            billingServiceSpy.loading$ = loading$;

            directive.ngOnInit();

            loading$.next(true);

            expect(directive['isLoading$'].value).toBe(true);
        });
    });
});