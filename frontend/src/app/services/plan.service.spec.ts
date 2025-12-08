import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';

import { PlanService } from './plan.service';
import {
    IPlan,
    IPlanComparison,
    ICurrentSubscription,
    IPlanFilter,
    IFeaturesListResponse,
    IPlanFeature,
    IPlanUsage,
    IPlanLimitUsage
} from '../models/plan.model';

describe('PlanService', () => {
    let service: PlanService;
    let httpMock: HttpTestingController;
    let httpClient: any;

    const mockPlans: IPlan[] = [
        {
            id: 1,
            name: 'Starter',
            slug: 'starter',
            price: '9',
            formatted_price: '$9',
            billing_interval: 'month',
            billing_interval_display: 'Monthly',
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
            billing_interval_display: 'Monthly',
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

    const mockFeaturesList: IFeaturesListResponse = {
        features: [
            {
                name: 'basic_features',
                display_name: 'Basic Features',
                description: 'Core functionality for small teams',
                category: 'core',
                available_in_plans: ['starter', 'professional'],
                popular_in_plans: ['professional']
            },
            {
                name: 'advanced_features',
                display_name: 'Advanced Features',
                description: 'Advanced functionality for larger teams',
                category: 'advanced',
                available_in_plans: ['professional'],
                popular_in_plans: ['professional']
            }
        ],
        categories: ['core', 'advanced']
    };

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [PlanService]
        });

        httpClient = TestBed.inject(HttpTestingController);
        httpMock = TestBed.inject(HttpTestingController);
        service = TestBed.inject(PlanService);
    });

    afterEach(() => {
        httpMock.verify();
    });

    describe('getAllPlans', () => {
        it('should return plans from API', () => {
            httpMock.expectOne('/api/plans')
                .flush({ data: mockPlans });

            service.getAllPlans().subscribe(plans => {
                expect(plans).toEqual(mockPlans);
            });
        });

        it('should apply interval filter', () => {
            const filteredPlans = mockPlans.filter(p => p.billing_interval === 'year');
            httpMock.expectOne('/api/plans?interval=year')
                .flush({ data: filteredPlans });

            service.getAllPlans({ interval: 'year' }).subscribe(plans => {
                expect(plans).toEqual(filteredPlans);
            });
        });

        it('should apply featured filter', () => {
            const featuredPlans = mockPlans.filter(p => p.is_popular);
            httpMock.expectOne('/api/plans?featured=true')
                .flush({ data: featuredPlans });

            service.getAllPlans({ featured: true }).subscribe(plans => {
                expect(plans).toEqual(featuredPlans);
            });
        });

        it('should apply feature filter', () => {
            const plansWithFeature = mockPlans.filter(p => p.features.includes('analytics'));
            httpMock.expectOne('/api/plans?has_feature=analytics')
                .flush({ data: plansWithFeature });

            service.getAllPlans({ has_feature: 'analytics' }).subscribe(plans => {
                expect(plans).toEqual(plansWithFeature);
            });
        });

        it('should apply multiple filters', () => {
            const filteredPlans = mockPlans.filter(p =>
                p.billing_interval === 'month' && p.is_popular
            );
            httpMock.expectOne('/api/plans?interval=month&featured=true')
                .flush({ data: filteredPlans });

            service.getAllPlans({ interval: 'month', featured: true }).subscribe(plans => {
                expect(plans).toEqual(filteredPlans);
            });
        });

        it('should handle API errors', () => {
            httpMock.expectOne('/api/plans')
                .flush('Server error', { status: 500 });

            service.getAllPlans().subscribe({
                next: () => fail('Should have failed'),
                error: (error) => {
                    expect(error.message).toBe('Server error occurred. Please try again later');
                }
            });
        });

        it('should handle 404 errors', () => {
            httpMock.expectOne('/api/plans')
                .flush('Not found', { status: 404 });

            service.getAllPlans().subscribe({
                next: () => fail('Should have failed'),
                error: (error) => {
                    expect(error.message).toBe('The requested plan was not found');
                }
            });
        });

        it('should handle 422 errors', () => {
            httpMock.expectOne('/api/plans')
                .flush('Invalid parameters', { status: 422 });

            service.getAllPlans().subscribe({
                next: () => fail('Should have failed'),
                error: (error) => {
                    expect(error.message).toBe('Invalid request parameters');
                }
            });
        });
    });

    describe('getPlanBySlug', () => {
        it('should return plan by slug', () => {
            const plan = mockPlans[0];
            httpMock.expectOne('/api/plans/starter')
                .flush({ data: plan });

            service.getPlanBySlug('starter').subscribe(result => {
                expect(result).toEqual(plan);
            });
        });

        it('should handle not found error', () => {
            httpMock.expectOne('/api/plans/nonexistent')
                .flush('Plan not found', { status: 404 });

            service.getPlanBySlug('nonexistent').subscribe({
                next: () => fail('Should have failed'),
                error: (error) => {
                    expect(error.message).toBe('The requested plan was not found');
                }
            });
        });
    });

    describe('comparePlans', () => {
        it('should compare multiple plans', () => {
            const mockComparison: IPlanComparison = {
                plans: mockPlans,
                comparison_matrix: {
                    features: [],
                    limits: []
                },
                all_features: ['basic_features', 'advanced_features'],
                all_limits: ['max_users', 'max_workspaces'],
                feature_categories: [],
                recommended_plan: undefined
            };

            httpMock.expectOne('/api/plans/compare?slugs=starter,professional')
                .flush({ data: mockComparison });

            service.comparePlans(['starter', 'professional']).subscribe(result => {
                expect(result).toEqual(mockComparison);
            });
        });

        it('should reject comparison with fewer than 2 plans', () => {
            service.comparePlans(['starter']).subscribe({
                next: () => fail('Should have failed'),
                error: (error) => {
                    expect(error.message).toBe('At least 2 plans are required for comparison');
                }
            });
        });

        it('should reject comparison with more than 5 plans', () => {
            service.comparePlans(['starter', 'professional', 'business', 'enterprise', 'ultimate', 'premium']).subscribe({
                next: () => fail('Should have failed'),
                error: (error) => {
                    expect(error.message).toBe('Cannot compare more than 5 plans at once');
                }
            });
        });

        it('should include features in comparison request', () => {
            const mockComparison: IPlanComparison = {
                plans: mockPlans,
                comparison_matrix: { features: [], limits: [] },
                all_features: [],
                all_limits: [],
                feature_categories: [],
                recommended_plan: undefined
            };

            httpMock.expectOne('/api/plans/compare?slugs=starter,professional&features=analytics,api_access')
                .flush({ data: mockComparison });

            service.comparePlans(['starter', 'professional'], ['analytics', 'api_access']).subscribe(result => {
                expect(result).toEqual(mockComparison);
            });
        });
    });

    describe('getCurrentPlan', () => {
        it('should return current subscription', () => {
            httpMock.expectOne('/api/plans/current')
                .flush({ data: mockCurrentSubscription });

            service.getCurrentPlan().subscribe(result => {
                expect(result).toEqual(mockCurrentSubscription);
            });
        });

        it('should update current plan subject', () => {
            httpMock.expectOne('/api/plans/current')
                .flush({ data: mockCurrentSubscription });

            let currentPlan: ICurrentSubscription | null = null;
            service.currentPlan$.subscribe(plan => {
                currentPlan = plan;
            });

            expect(currentPlan).toBeNull(); // Initial value

            service.getCurrentPlan().subscribe();

            expect(currentPlan).not.toBeNull();
        });

        it('should handle errors gracefully', () => {
            httpMock.expectOne('/api/plans/current')
                .flush('Unauthorized', { status: 401 });

            service.getCurrentPlan().subscribe({
                next: () => fail('Should have failed'),
                error: (error) => {
                    expect(error.message).toBe('Unauthorized. Please log in again.');
                }
            });
        });
    });

    describe('getAllFeatures', () => {
        it('should return all features', () => {
            httpMock.expectOne('/api/plans/features')
                .flush({ data: mockFeaturesList });

            service.getAllFeatures().subscribe(result => {
                expect(result).toEqual(mockFeaturesList);
            });
        });

        it('should filter features by category', () => {
            const coreFeatures = mockFeaturesList.features.filter(f => f.category === 'core');
            const filteredResponse = {
                features: coreFeatures,
                categories: ['core']
            };

            httpMock.expectOne('/api/plans/features?category=core')
                .flush({ data: filteredResponse });

            service.getAllFeatures('core').subscribe(result => {
                expect(result).toEqual(filteredResponse);
            });
        });
    });

    describe('getPopularPlans', () => {
        it('should return featured plans', () => {
            const featuredPlans = mockPlans.filter(p => p.is_popular);
            httpMock.expectOne('/api/plans?featured=true')
                .flush({ data: featuredPlans });

            service.getPopularPlans().subscribe(result => {
                expect(result).toEqual(featuredPlans);
            });
        });
    });

    describe('filterPlans', () => {
        it('should apply filters and return results', () => {
            const filters: IPlanFilter = {
                interval: 'month',
                featured: true,
                min_price: 10,
                max_price: 50
            };

            const filteredPlans = mockPlans.filter(p =>
                p.billing_interval === filters.interval &&
                p.is_popular === filters.featured &&
                parseFloat(p.price) >= filters.min_price! &&
                parseFloat(p.price) <= filters.max_price!
            );

            httpMock.expectOne('/api/plans?interval=month&featured=true&min_price=10&max_price=50')
                .flush({ data: filteredPlans });

            service.filterPlans(filters).subscribe(result => {
                expect(result).toEqual(filteredPlans);
            });
        });
    });

    describe('getPlanUsage', () => {
        it('should return usage from current subscription', () => {
            httpMock.expectOne('/api/plans/current')
                .flush({ data: mockCurrentSubscription });

            service.getPlanUsage().subscribe(result => {
                expect(result).toEqual(mockCurrentSubscription.usage);
            });
        });

        it('should return default usage when no subscription', () => {
            httpMock.expectOne('/api/plans/current')
                .flush({ data: null });

            service.getPlanUsage().subscribe(result => {
                expect(result).toEqual({
                    users: 0,
                    workspaces: 0,
                    boards: 0
                });
            });
        });
    });

    describe('getLimitUsage', () => {
        it('should calculate usage percentages correctly', () => {
            httpMock.expectOne('/api/plans/current')
                .flush({ data: mockCurrentSubscription });

            service.getLimitUsage().subscribe(result => {
                const userUsage = result.find(u => u.limit_name === 'max_users');
                expect(userUsage?.usage_percentage).toBe(60); // 3/5 * 100 = 60%

                const workspaceUsage = result.find(u => u.limit_name === 'max_workspaces');
                expect(workspaceUsage?.usage_percentage).toBe(50); // 1/2 * 100 = 50%
            });
        });

        it('should handle unlimited limits', () => {
            const unlimitedPlan = {
                ...mockCurrentSubscription,
                plan: {
                    ...mockCurrentSubscription.plan,
                    limits: {
                        max_users: -1,
                        max_workspaces: -1,
                        max_boards: -1
                    }
                }
            };

            httpMock.expectOne('/api/plans/current')
                .flush({ data: unlimitedPlan });

            service.getLimitUsage().subscribe(result => {
                result.forEach(usage => {
                    expect(usage.is_unlimited).toBe(true);
                    expect(usage.usage_percentage).toBe(0);
                });
            });
        });

        it('should handle missing limits', () => {
            const planWithMissingLimits = {
                ...mockCurrentSubscription,
                plan: {
                    ...mockCurrentSubscription.plan,
                    limits: {
                        max_users: 5
                        // Missing other limits
                    }
                }
            };

            httpMock.expectOne('/api/plans/current')
                .flush({ data: planWithMissingLimits });

            service.getLimitUsage().subscribe(result => {
                expect(result.length).toBe(1); // Only max_users should be included
            });
        });
    });

    describe('hasFeature', () => {
        it('should return true when plan has feature', () => {
            httpMock.expectOne('/api/plans/current')
                .flush({ data: mockCurrentSubscription });

            service.hasFeature('basic_features').subscribe(result => {
                expect(result).toBe(true);
            });
        });

        it('should return false when plan does not have feature', () => {
            httpMock.expectOne('/api/plans/current')
                .flush({ data: mockCurrentSubscription });

            service.hasFeature('nonexistent_feature').subscribe(result => {
                expect(result).toBe(false);
            });
        });

        it('should return false when no subscription', () => {
            httpMock.expectOne('/api/plans/current')
                .flush({ data: null });

            service.hasFeature('basic_features').subscribe(result => {
                expect(result).toBe(false);
            });
        });
    });

    describe('getPlansByInterval', () => {
        it('should return monthly plans', () => {
            const monthlyPlans = mockPlans.filter(p => p.billing_interval === 'month');
            httpMock.expectOne('/api/plans?interval=month')
                .flush({ data: monthlyPlans });

            service.getPlansByInterval('month').subscribe(result => {
                expect(result).toEqual(monthlyPlans);
            });
        });
    });

    it('should return yearly plans', () => {
        const yearlyPlans = mockPlans.filter(p => p.billing_interval === 'year');
        httpMock.expectOne('/api/plans?interval=year')
            .flush({ data: yearlyPlans });

        service.getPlansByInterval('year').subscribe(result => {
            expect(result).toEqual(yearlyPlans);
        });
    });

    describe('getPlansWithFeature', () => {
        it('should return plans with specific feature', () => {
            const plansWithAnalytics = mockPlans.filter((p: IPlan) => p.features.includes('analytics'));
            httpMock.expectOne('/api/plans?has_feature=analytics')
                .flush({ data: plansWithAnalytics });

            service.getPlansWithFeature('analytics').subscribe((result: IPlan[]) => {
                expect(result).toEqual(plansWithAnalytics);
            });
        });
    });

    describe('clearCache', () => {
        it('should clear all caches and reset current plan', () => {
            let currentPlan: ICurrentSubscription | null = mockCurrentSubscription;
            service.currentPlan$.subscribe((plan: ICurrentSubscription | null) => {
                currentPlan = plan;
            });

            service.clearCache();

            expect(currentPlan).toBeNull();
        });
    });

    describe('refreshCurrentPlan', () => {
        it('should clear cache and fetch fresh data', () => {
            httpMock.expectOne('/api/plans/current')
                .flush({ data: mockCurrentSubscription });

            service.refreshCurrentPlan().subscribe((result: ICurrentSubscription) => {
                expect(result).not.toBeNull();
            });
        });
    });

    describe('caching behavior', () => {
        it('should cache plans data', () => {
            httpMock.expectOne('/api/plans')
                .flush({ data: mockPlans });

            // First call should hit API
            service.getAllPlans().subscribe();

            // Second call should use cache
            service.getAllPlans().subscribe((plans: IPlan[]) => {
                expect(plans).toEqual(mockPlans);
            });

            // Should only make one HTTP request
            httpMock.expectNone('/api/plans');
        });

        it('should cache plan data', () => {
            const plan = mockPlans[0];
            httpMock.expectOne('/api/plans/starter')
                .flush({ data: plan });

            // First call should hit API
            service.getPlanBySlug('starter').subscribe();

            // Second call should use cache
            service.getPlanBySlug('starter').subscribe((result: IPlan) => {
                expect(result).toEqual(plan);
            });

            // Should only make one HTTP request
            httpMock.expectNone('/api/plans/starter');
        });

        it('should cache features data', () => {
            httpMock.expectOne('/api/plans/features')
                .flush({ data: mockFeaturesList });

            // First call should hit API
            service.getAllFeatures().subscribe();

            // Second call should use cache
            service.getAllFeatures().subscribe((result: IFeaturesListResponse) => {
                expect(result).toEqual(mockFeaturesList);
            });

            // Should only make one HTTP request
            httpMock.expectNone('/api/plans/features');
        });
    });

    describe('error handling', () => {
        it('should handle network errors', () => {
            httpMock.expectOne('/api/plans')
                .flush(null, { status: 0, statusText: 'Network Error' });

            service.getAllPlans().subscribe({
                next: () => fail('Should have failed'),
                error: (error: any) => {
                    expect(error.message).toBe('Failed to fetch plans');
                }
            });
        });

        it('should handle malformed responses', () => {
            httpMock.expectOne('/api/plans')
                .flush('Invalid JSON', { status: 200, headers: { 'Content-Type': 'text/plain' } });

            service.getAllPlans().subscribe({
                next: () => fail('Should have failed'),
                error: (error: any) => {
                    expect(error.message).toBe('Failed to fetch plans');
                }
            });
        });
    });
});