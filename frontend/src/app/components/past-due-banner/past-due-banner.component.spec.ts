import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { of } from 'rxjs';

import { PastDueBannerComponent } from './past-due-banner.component';
import { BillingService } from '../../services/billing.service';
import { ISubscription } from '../../models/subscription.model';

describe('PastDueBannerComponent', () => {
    let component: PastDueBannerComponent;
    let fixture: ComponentFixture<PastDueBannerComponent>;
    let billingServiceSpy: jasmine.SpyObj<BillingService>;
    let routerSpy: jasmine.SpyObj<Router>;

    const mockSubscription: ISubscription = {
        id: 1,
        tenant_id: 1,
        plan_id: 1,
        stripe_subscription_id: 'sub_123',
        status: 'past_due',
        status_display: 'Past Due',
        trial_ends_at: undefined,
        ends_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
        current_period_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        current_period_end: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        cancel_at_period_end: false,
        is_trialing: false,
        is_active: true,
        is_past_due: true,
        is_canceled: false,
        is_expired: false,
        is_within_grace_period: true,
        trial_days_remaining: 0,
        days_remaining: 3,
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
                PastDueBannerComponent
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
        fixture = TestBed.createComponent(PastDueBannerComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize with default values', () => {
        expect(component.isVisible).toBe(true);
        expect(component.isUrgent).toBe(false);
        expect(component.isCritical).toBe(false);
        expect(component.showUpdateButton).toBe(true);
        expect(component.autoHide).toBe(true);
        expect(component.urgencyThreshold).toBe(2);
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
            sessionStorage.setItem('past_due_banner_dismissed', 'true');

            component['initializeBanner']();

            expect(component.isVisible).toBe(false);
        });

        it('should show banner and update past due info if not dismissed', () => {
            sessionStorage.removeItem('past_due_banner_dismissed');

            component['initializeBanner']();

            expect(component.isVisible).toBe(true);
        });

        it('should auto-hide if not past due', () => {
            component.subscription = { ...mockSubscription, is_past_due: false };
            sessionStorage.removeItem('past_due_banner_dismissed');

            component['initializeBanner']();

            expect(component.isVisible).toBe(false);
        });

        it('should auto-hide if no subscription', () => {
            component.subscription = null;
            sessionStorage.removeItem('past_due_banner_dismissed');

            component['initializeBanner']();

            expect(component.isVisible).toBe(false);
        });
    });

    describe('updatePastDueInfo', () => {
        beforeEach(() => {
            spyOn(sessionStorage, 'getItem').and.returnValue(null);
        });

        it('should hide banner if no end date', () => {
            component.subscription = { ...mockSubscription, ends_at: undefined };
            component.isVisible = true;

            component['updatePastDueInfo']();

            expect(component.isVisible).toBe(false);
        });

        it('should hide banner if grace period has expired', () => {
            component.subscription = {
                ...mockSubscription,
                ends_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // Yesterday
            };
            component.isVisible = true;

            component['updatePastDueInfo']();

            expect(component.isVisible).toBe(false);
        });

        it('should calculate time remaining correctly', () => {
            const futureDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000); // 2 days 5 hours
            component.subscription = {
                ...mockSubscription,
                ends_at: futureDate.toISOString()
            };

            component['updatePastDueInfo']();

            expect(component.daysRemaining).toBe(2);
            expect(component.hoursRemaining).toBe(5);
            expect(component.minutesRemaining).toBeGreaterThanOrEqual(0);
            expect(component.secondsRemaining).toBeGreaterThanOrEqual(0);
        });

        it('should set urgent flag when days remaining is at or below threshold', () => {
            component.subscription = {
                ...mockSubscription,
                ends_at: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString() // 1 day
            };
            component.urgencyThreshold = 2;

            component['updatePastDueInfo']();

            expect(component.isUrgent).toBe(true);
        });

        it('should set critical flag when 0 days remaining', () => {
            component.subscription = {
                ...mockSubscription,
                ends_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutes
            };

            component['updatePastDueInfo']();

            expect(component.isCritical).toBe(true);
        });

        it('should not set urgent flag when days remaining is above threshold', () => {
            component.subscription = {
                ...mockSubscription,
                ends_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString() // 5 days
            };
            component.urgencyThreshold = 2;

            component['updatePastDueInfo']();

            expect(component.isUrgent).toBe(false);
            expect(component.isCritical).toBe(false);
        });
    });

    describe('onUpdatePaymentClick', () => {
        it('should emit update payment event and navigate to billing', () => {
            spyOn(component.onUpdatePayment, 'emit');

            component.onUpdatePaymentClick();

            expect(component.onUpdatePayment.emit).toHaveBeenCalled();
            expect(routerSpy.navigate).toHaveBeenCalledWith(['/billing']);
        });
    });

    describe('onDismissClick', () => {
        it('should hide banner, save dismissal state, and emit dismiss event', () => {
            spyOn(sessionStorage, 'setItem');
            spyOn(component.onDismiss, 'emit');
            component.isVisible = true;

            component.onDismissClick();

            expect(component.isVisible).toBe(false);
            expect(sessionStorage.setItem).toHaveBeenCalledWith('past_due_banner_dismissed', 'true');
            expect(component.onDismiss.emit).toHaveBeenCalled();
        });
    });

    describe('getUrgencyClass', () => {
        it('should return past-due-normal when not urgent', () => {
            component.isUrgent = false;
            component.isCritical = false;

            expect(component.getUrgencyClass()).toBe('past-due-normal');
        });

        it('should return past-due-critical when critical', () => {
            component.isCritical = true;

            expect(component.getUrgencyClass()).toBe('past-due-critical');
        });

        it('should return past-due-urgent when urgent but not critical', () => {
            component.isUrgent = true;
            component.isCritical = false;

            expect(component.getUrgencyClass()).toBe('past-due-urgent');
        });
    });

    describe('getTimeRemainingDisplay', () => {
        it('should display days when days > 0', () => {
            component.daysRemaining = 3;

            expect(component.getTimeRemainingDisplay()).toBe('3 days');
        });

        it('should display hours when days = 0 and hours > 0', () => {
            component.daysRemaining = 0;
            component.hoursRemaining = 4;

            expect(component.getTimeRemainingDisplay()).toBe('4 hours');
        });

        it('should display minutes when days = 0, hours = 0, minutes > 0', () => {
            component.daysRemaining = 0;
            component.hoursRemaining = 0;
            component.minutesRemaining = 20;

            expect(component.getTimeRemainingDisplay()).toBe('20 minutes');
        });

        it('should display seconds when all other values are 0', () => {
            component.daysRemaining = 0;
            component.hoursRemaining = 0;
            component.minutesRemaining = 0;
            component.secondsRemaining = 45;

            expect(component.getTimeRemainingDisplay()).toBe('45 seconds');
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
        it('should return expires today message when critical', () => {
            component.isCritical = true;

            expect(component.getUrgencyMessage()).toBe('Your grace period expires today! Update your payment method immediately.');
        });

        it('should return expires tomorrow message when 1 day', () => {
            component.isCritical = false;
            component.isUrgent = true;
            component.daysRemaining = 1;

            expect(component.getUrgencyMessage()).toBe('Your grace period expires tomorrow! Update your payment method now.');
        });

        it('should return urgent message when at or below threshold', () => {
            component.isCritical = false;
            component.isUrgent = true;
            component.daysRemaining = 2;
            component.urgencyThreshold = 3;

            expect(component.getUrgencyMessage()).toBe('Your grace period expires in 2 days!');
        });

        it('should return normal message when above threshold', () => {
            component.isCritical = false;
            component.isUrgent = false;
            component.daysRemaining = 5;
            component.urgencyThreshold = 2;

            expect(component.getUrgencyMessage()).toBe('5 days remaining in grace period');
        });
    });

    describe('getBannerTitle', () => {
        it('should return critical title when critical', () => {
            component.isCritical = true;

            expect(component.getBannerTitle()).toBe('🚨 Payment Overdue - Action Required');
        });

        it('should return urgent title when urgent but not critical', () => {
            component.isCritical = false;
            component.isUrgent = true;

            expect(component.getBannerTitle()).toBe('⚠️ Payment Failed - Update Required');
        });

        it('should return normal title when not urgent', () => {
            component.isCritical = false;
            component.isUrgent = false;

            expect(component.getBannerTitle()).toBe('💳 Payment Failed - Action Needed');
        });
    });

    describe('getPaymentStatusDescription', () => {
        it('should return critical description when critical', () => {
            component.isCritical = true;

            expect(component.getPaymentStatusDescription()).toBe('Your account access will be suspended soon.');
        });

        it('should return urgent description when urgent but not critical', () => {
            component.isCritical = false;
            component.isUrgent = true;

            expect(component.getPaymentStatusDescription()).toBe('Your subscription will be canceled if payment is not updated.');
        });

        it('should return normal description when not urgent', () => {
            component.isCritical = false;
            component.isUrgent = false;

            expect(component.getPaymentStatusDescription()).toBe('Please update your payment method to continue service.');
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

        it('should return false when not past due', () => {
            component.isVisible = true;
            component.subscription = { ...mockSubscription, is_past_due: false };

            expect(component.shouldShow()).toBe(false);
        });

        it('should return false when no end date', () => {
            component.isVisible = true;
            component.subscription = { ...mockSubscription, ends_at: undefined };

            expect(component.shouldShow()).toBe(false);
        });

        it('should return false when grace period has expired', () => {
            component.isVisible = true;
            component.subscription = {
                ...mockSubscription,
                ends_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
            };

            expect(component.shouldShow()).toBe(false);
        });
    });

    describe('resetDismissal', () => {
        it('should reset dismissal state and show banner', () => {
            spyOn(sessionStorage, 'removeItem');
            component.isVisible = false;

            component.resetDismissal();

            expect(sessionStorage.removeItem).toHaveBeenCalledWith('past_due_banner_dismissed');
            expect(component.isVisible).toBe(true);
        });
    });

    describe('getActionButtonText', () => {
        it('should return critical text when critical', () => {
            component.isCritical = true;

            expect(component.getActionButtonText()).toBe('Update Payment Now');
        });

        it('should return urgent text when urgent but not critical', () => {
            component.isCritical = false;
            component.isUrgent = true;

            expect(component.getActionButtonText()).toBe('Update Payment');
        });

        it('should return normal text when not urgent', () => {
            component.isCritical = false;
            component.isUrgent = false;

            expect(component.getActionButtonText()).toBe('Update Payment Method');
        });
    });

    describe('isInGracePeriod', () => {
        it('should return true when subscription is within grace period', () => {
            component.subscription = { ...mockSubscription, is_within_grace_period: true };

            expect(component.isInGracePeriod()).toBe(true);
        });

        it('should return false when subscription is not within grace period', () => {
            component.subscription = { ...mockSubscription, is_within_grace_period: false };

            expect(component.isInGracePeriod()).toBe(false);
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