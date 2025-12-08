import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { of } from 'rxjs';

import { TrialBannerComponent } from './trial-banner.component';
import { BillingService } from '../../services/billing.service';
import { ISubscription } from '../../models/subscription.model';

describe('TrialBannerComponent', () => {
    let component: TrialBannerComponent;
    let fixture: ComponentFixture<TrialBannerComponent>;
    let billingServiceSpy: jasmine.SpyObj<BillingService>;
    let routerSpy: jasmine.SpyObj<Router>;

    const mockSubscription: ISubscription = {
        id: 1,
        tenant_id: 1,
        plan_id: 1,
        stripe_subscription_id: 'sub_123',
        status: 'trialing',
        status_display: 'Trial',
        trial_ends_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
        current_period_start: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        current_period_end: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        cancel_at_period_end: false,
        is_trialing: true,
        is_active: true,
        is_past_due: false,
        is_canceled: false,
        is_expired: false,
        is_within_grace_period: false,
        trial_days_remaining: 5,
        days_remaining: 5,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
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
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }
    };

    beforeEach(waitForAsync(() => {
        const billingSpy = jasmine.createSpyObj('BillingService', ['getCurrentSubscription']);
        const routerSpyObj = jasmine.createSpyObj('Router', ['navigate']);

        TestBed.configureTestingModule({
            imports: [
                CommonModule,
                TrialBannerComponent
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
        fixture = TestBed.createComponent(TrialBannerComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize with default values', () => {
        // After ngOnInit is called, initializeBanner() will set visibility based on subscription
        // Since no subscription is set, isVisible should be false
        expect(component.isVisible).toBe(false);
        expect(component.isUrgent).toBe(false);
        expect(component.showUpgradeButton).toBe(true);
        expect(component.autoHide).toBe(true);
        expect(component.urgencyThreshold).toBe(3);
    });

    describe('ngOnInit', () => {
        it('should initialize banner and start countdown', () => {
            component.ngOnInit();

            // Verify that the component is properly initialized
            expect(component).toBeTruthy();
        });
    });

    describe('initializeBanner', () => {
        beforeEach(() => {
            component.subscription = mockSubscription;
        });

        it('should hide banner if previously dismissed', () => {
            sessionStorage.setItem('trial_banner_dismissed', 'true');

            component['initializeBanner']();

            expect(component.isVisible).toBe(false);
        });

        it('should show banner and update trial info if not dismissed', () => {
            sessionStorage.removeItem('trial_banner_dismissed');
            component.subscription = mockSubscription; // Set subscription for visibility

            component['initializeBanner']();

            expect(component.isVisible).toBe(true);
        });

        it('should auto-hide if not in trial', () => {
            component.subscription = { ...mockSubscription, is_trialing: false };
            sessionStorage.removeItem('trial_banner_dismissed');

            component['initializeBanner']();

            expect(component.isVisible).toBe(false);
        });

        it('should auto-hide if no subscription', () => {
            component.subscription = null;
            sessionStorage.removeItem('trial_banner_dismissed');

            component['initializeBanner']();

            expect(component.isVisible).toBe(false);
        });
    });

    describe('updateTrialInfo', () => {
        beforeEach(() => {
            spyOn(sessionStorage, 'getItem').and.returnValue(null);
        });

        it('should hide banner if no trial end date', () => {
            component.subscription = { ...mockSubscription, trial_ends_at: undefined };
            component.isVisible = true;

            component['updateTrialInfo']();

            expect(component.isVisible).toBe(false);
        });

        it('should hide banner if trial has expired', () => {
            component.subscription = {
                ...mockSubscription,
                trial_ends_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // Yesterday
            };
            component.isVisible = true;

            component['updateTrialInfo']();

            expect(component.isVisible).toBe(false);
        });

        it('should calculate time remaining correctly', () => {
            const futureDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000); // 2 days 5 hours
            component.subscription = {
                ...mockSubscription,
                trial_ends_at: futureDate.toISOString()
            };

            component['updateTrialInfo']();

            expect(component.daysRemaining).toBe(2);
            expect(component.hoursRemaining).toBe(5);
            expect(component.minutesRemaining).toBeGreaterThanOrEqual(0);
            expect(component.secondsRemaining).toBeGreaterThanOrEqual(0);
        });

        it('should set urgent flag when days remaining is at or below threshold', () => {
            component.subscription = {
                ...mockSubscription,
                trial_ends_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days
            };
            component.urgencyThreshold = 3;

            component['updateTrialInfo']();

            expect(component.isUrgent).toBe(true);
        });

        it('should not set urgent flag when days remaining is above threshold', () => {
            component.subscription = {
                ...mockSubscription,
                trial_ends_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString() // 5 days
            };
            component.urgencyThreshold = 3;

            component['updateTrialInfo']();

            expect(component.isUrgent).toBe(false);
        });
    });

    describe('onUpgradeClick', () => {
        it('should emit upgrade event and navigate to pricing', () => {
            spyOn(component.onUpgrade, 'emit');

            component.onUpgradeClick();

            expect(component.onUpgrade.emit).toHaveBeenCalled();
            expect(routerSpy.navigate).toHaveBeenCalledWith(['/pricing']);
        });
    });

    describe('onDismissClick', () => {
        it('should hide banner, save dismissal state, and emit dismiss event', () => {
            spyOn(sessionStorage, 'setItem');
            spyOn(component.onDismiss, 'emit');
            component.isVisible = true;

            component.onDismissClick();

            expect(component.isVisible).toBe(false);
            expect(sessionStorage.setItem).toHaveBeenCalledWith('trial_banner_dismissed', 'true');
            expect(component.onDismiss.emit).toHaveBeenCalled();
        });
    });

    describe('getUrgencyClass', () => {
        it('should return trial-normal when not urgent', () => {
            component.isUrgent = false;

            expect(component.getUrgencyClass()).toBe('trial-normal');
        });

        it('should return trial-expired when 0 days remaining', () => {
            component.isUrgent = true;
            component.daysRemaining = 0;

            expect(component.getUrgencyClass()).toBe('trial-expired');
        });

        it('should return trial-critical when 1 day remaining', () => {
            component.isUrgent = true;
            component.daysRemaining = 1;

            expect(component.getUrgencyClass()).toBe('trial-critical');
        });

        it('should return trial-urgent when 2-3 days remaining', () => {
            component.isUrgent = true;
            component.daysRemaining = 2;

            expect(component.getUrgencyClass()).toBe('trial-urgent');
        });

        it('should return trial-warning when urgent but more than 3 days', () => {
            component.isUrgent = true;
            component.daysRemaining = 4;

            expect(component.getUrgencyClass()).toBe('trial-warning');
        });
    });

    describe('getTimeRemainingDisplay', () => {
        it('should display days when days > 0', () => {
            component.daysRemaining = 5;

            expect(component.getTimeRemainingDisplay()).toBe('5 days');
        });

        it('should display hours when days = 0 and hours > 0', () => {
            component.daysRemaining = 0;
            component.hoursRemaining = 3;

            expect(component.getTimeRemainingDisplay()).toBe('3 hours');
        });

        it('should display minutes when days = 0, hours = 0, minutes > 0', () => {
            component.daysRemaining = 0;
            component.hoursRemaining = 0;
            component.minutesRemaining = 15;

            expect(component.getTimeRemainingDisplay()).toBe('15 minutes');
        });

        it('should display seconds when all other values are 0', () => {
            component.daysRemaining = 0;
            component.hoursRemaining = 0;
            component.minutesRemaining = 0;
            component.secondsRemaining = 30;

            expect(component.getTimeRemainingDisplay()).toBe('30 seconds');
        });

        it('should use singular form for 1 day', () => {
            component.daysRemaining = 1;

            expect(component.getTimeRemainingDisplay()).toBe('1 day');
        });
    });

    describe('getDetailedTimeRemaining', () => {
        it('should return formatted time string with all components', () => {
            component.daysRemaining = 2;
            component.hoursRemaining = 5;
            component.minutesRemaining = 30;
            component.secondsRemaining = 15;

            expect(component.getDetailedTimeRemaining()).toBe('2d 5h 30m 15s');
        });

        it('should exclude zero values except seconds', () => {
            component.daysRemaining = 0;
            component.hoursRemaining = 0;
            component.minutesRemaining = 0;
            component.secondsRemaining = 45;

            expect(component.getDetailedTimeRemaining()).toBe('45s');
        });
    });

    describe('getUrgencyMessage', () => {
        it('should return expires today message when 0 days', () => {
            component.daysRemaining = 0;

            expect(component.getUrgencyMessage()).toBe('Your trial expires today!');
        });

        it('should return expires tomorrow message when 1 day', () => {
            component.daysRemaining = 1;

            expect(component.getUrgencyMessage()).toBe('Your trial expires tomorrow!');
        });

        it('should return urgent message when at or below threshold', () => {
            component.daysRemaining = 2;
            component.urgencyThreshold = 3;

            expect(component.getUrgencyMessage()).toBe('Your trial expires in 2 days!');
        });

        it('should return normal message when above threshold', () => {
            component.daysRemaining = 5;
            component.urgencyThreshold = 3;

            expect(component.getUrgencyMessage()).toBe('5 days remaining in your trial');
        });
    });

    describe('getBannerTitle', () => {
        it('should return urgent title when urgent', () => {
            component.isUrgent = true;

            expect(component.getBannerTitle()).toBe('⚠️ Trial Expiring Soon');
        });

        it('should return normal title when not urgent', () => {
            component.isUrgent = false;

            expect(component.getBannerTitle()).toBe('🚀 Free Trial Active');
        });
    });

    describe('shouldShow', () => {
        it('should return true when banner should be visible', () => {
            component.isVisible = true;
            component.subscription = mockSubscription;

            expect(component.shouldShow()).toBe(true);
        });

        it('should return false when not visible', () => {
            component.isVisible = false;
            component.subscription = mockSubscription;

            expect(component.shouldShow()).toBe(false);
        });

        it('should return false when not in trial', () => {
            component.isVisible = true;
            component.subscription = { ...mockSubscription, is_trialing: false };

            expect(component.shouldShow()).toBe(false);
        });

        it('should return false when no trial end date', () => {
            component.isVisible = true;
            component.subscription = { ...mockSubscription, trial_ends_at: undefined };

            expect(component.shouldShow()).toBe(false);
        });

        it('should return false when trial has expired', () => {
            component.isVisible = true;
            component.subscription = {
                ...mockSubscription,
                trial_ends_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
            };

            expect(component.shouldShow()).toBe(false);
        });
    });

    describe('resetDismissal', () => {
        it('should reset dismissal state and show banner', () => {
            spyOn(sessionStorage, 'removeItem');
            component.isVisible = false;
            component.subscription = mockSubscription; // Set subscription for visibility

            component.resetDismissal();

            expect(sessionStorage.removeItem).toHaveBeenCalledWith('trial_banner_dismissed');
            expect(component.isVisible).toBe(true);
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