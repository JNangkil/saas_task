import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil, Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

import { PlanService } from '../../services/plan.service';
import { BillingService } from '../../services/billing.service';
import { ToastService } from '../../services/toast.service';

import {
    IPlan,
    IPlanComparison,
    ICurrentSubscription,
    IPlanFilter,
    IPlanFeature,
    IFeaturesListResponse
} from '../../models/plan.model';

import {
    ICheckoutSession,
    ISubscription
} from '../../models/subscription.model';

/**
 * PricingPageComponent displays pricing plans, allows comparison between plans,
 * and handles checkout initiation for new subscriptions.
 * 
 * Features:
 * - Monthly/yearly billing toggle
 * - Plan comparison feature
 * - FAQ section
 * - Testimonials/social proof
 * - Current plan indicator for logged-in users
 * - Responsive design with accessibility features
 */
@Component({
    selector: 'app-pricing-page',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule],
    templateUrl: './pricing-page.component.html',
    styleUrls: ['./pricing-page.component.css']
})
export class PricingPageComponent implements OnInit, OnDestroy {
    // Component state
    plans: IPlan[] = [];
    currentSubscription: ICurrentSubscription | null = null;
    featuredPlans: IPlan[] = [];
    popularPlans: IPlan[] = [];

    // UI state
    isLoading = true;
    isProcessingCheckout = false;
    error: string | null = null;

    // Billing toggle
    billingInterval: 'month' | 'year' = 'month';

    // Plan comparison
    showComparison = false;
    selectedPlansForComparison: string[] = [];
    planComparison: IPlanComparison | null = null;
    comparisonLoading = false;

    // FAQ section
    expandedFaqItems: Set<number> = new Set();

    // Features
    allFeatures: IPlanFeature[] = [];
    featureCategories: string[] = [];

    // Testimonials
    testimonials = [
        {
            id: 1,
            name: 'Sarah Johnson',
            role: 'CEO at TechStart',
            content: 'The Professional plan gave us all the tools we needed to scale our team collaboration without breaking the bank.',
            avatar: 'SJ',
            rating: 5
        },
        {
            id: 2,
            name: 'Michael Chen',
            role: 'Product Manager at InnovateCo',
            content: 'Switching to the Business plan was the best decision. The advanced analytics and unlimited workspaces transformed our workflow.',
            avatar: 'MC',
            rating: 5
        },
        {
            id: 3,
            name: 'Emily Rodriguez',
            role: 'CTO at DesignHub',
            content: 'The Enterprise plan with custom features and priority support has been invaluable for our growing organization.',
            avatar: 'ER',
            rating: 5
        }
    ];

    // FAQ items
    faqItems = [
        {
            id: 1,
            question: 'Can I change my plan later?',
            answer: 'Yes! You can upgrade or downgrade your plan at any time. When upgrading, you\'ll be charged a prorated amount for the remainder of your billing cycle. When downgrading, the change will take effect at the start of your next billing cycle.'
        },
        {
            id: 2,
            question: 'What payment methods do you accept?',
            answer: 'We accept all major credit cards (Visa, Mastercard, American Express, Discover), as well as debit cards. For Enterprise plans, we also offer invoice-based payments with NET 30 terms.'
        },
        {
            id: 3,
            question: 'Is there a free trial available?',
            answer: 'Yes! All paid plans come with a 14-day free trial. No credit card is required to start your trial. You can explore all features before deciding which plan works best for your team.'
        },
        {
            id: 4,
            question: 'Can I cancel my subscription anytime?',
            answer: 'Absolutely. You can cancel your subscription at any time from your account settings. Your access will continue until the end of your current billing period, and you won\'t be charged again.'
        },
        {
            id: 5,
            question: 'Do you offer discounts for annual billing?',
            answer: 'Yes! When you choose annual billing, you get 2 months free (equivalent to a 17% discount) compared to monthly billing. This discount is automatically applied when you select yearly billing.'
        },
        {
            id: 6,
            question: 'What happens if I exceed my plan limits?',
            answer: 'We\'ll notify you when you\'re approaching your limits. You can upgrade your plan at any time to accommodate your growth. We never automatically charge you for overages - you have full control over your subscription.'
        }
    ];

    // Form for contact (enterprise plan)
    contactForm: FormGroup;

    // Unsubscribe subject
    private destroy$ = new Subject<void>();

    constructor(
        private planService: PlanService,
        private billingService: BillingService,
        private toastService: ToastService,
        private router: Router,
        private fb: FormBuilder,
        private cdr: ChangeDetectorRef
    ) {
        // Initialize contact form
        this.contactForm = this.fb.group({
            name: [''],
            email: [''],
            company: [''],
            message: ['']
        });
    }

    ngOnInit(): void {
        this.loadPricingData();
        this.loadCurrentSubscription();
        this.loadAllFeatures();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Load all pricing plans and related data
     */
    private loadPricingData(): void {
        this.isLoading = true;
        this.error = null;

        const filters: IPlanFilter = {
            interval: this.billingInterval
        };

        this.planService.getAllPlans(filters)
            .pipe(
                takeUntil(this.destroy$),
                catchError(error => {
                    this.error = 'Failed to load pricing plans. Please try again.';
                    this.isLoading = false;
                    console.error('Error loading plans:', error);
                    return of([]);
                })
            )
            .subscribe(plans => {
                this.plans = plans;
                this.featuredPlans = plans.filter(plan => plan.is_popular);
                this.popularPlans = plans.filter(plan => plan.is_popular);
                this.isLoading = false;
                this.cdr.detectChanges();
            });
    }

    /**
     * Load current user's subscription if authenticated
     */
    private loadCurrentSubscription(): void {
        this.planService.getCurrentPlan()
            .pipe(
                takeUntil(this.destroy$),
                catchError(error => {
                    // User might not be authenticated, which is fine for pricing page
                    console.log('No current subscription found (user may not be authenticated)');
                    return of(null);
                })
            )
            .subscribe(subscription => {
                this.currentSubscription = subscription;
                this.cdr.detectChanges();
            });
    }

    /**
     * Load all available features for comparison
     */
    private loadAllFeatures(): void {
        this.planService.getAllFeatures()
            .pipe(
                takeUntil(this.destroy$),
                catchError(error => {
                    console.error('Error loading features:', error);
                    return of({ features: [], categories: [] } as IFeaturesListResponse);
                })
            )
            .subscribe(response => {
                this.allFeatures = response.features;
                this.featureCategories = response.categories;
                this.cdr.detectChanges();
            });
    }

    /**
     * Toggle between monthly and yearly billing
     */
    toggleBillingInterval(interval: 'month' | 'year'): void {
        if (this.billingInterval === interval) return;

        this.billingInterval = interval;
        this.loadPricingData();
    }

    /**
     * Initiate checkout for a selected plan
     */
    async selectPlan(plan: IPlan): Promise<void> {
        if (this.isProcessingCheckout) return;

        // Check if user already has this plan
        if (this.currentSubscription?.plan?.id === plan.id) {
            this.toastService.info('You are already subscribed to this plan');
            return;
        }

        this.isProcessingCheckout = true;

        try {
            // Create checkout session
            const checkoutSession = await this.billingService.createCheckoutSession(plan.id).toPromise();

            if (checkoutSession?.session_id) {
                // Redirect to Stripe Checkout
                await this.billingService.redirectToCheckout(checkoutSession.session_id);
            } else {
                throw new Error('Failed to create checkout session');
            }
        } catch (error: any) {
            console.error('Checkout error:', error);
            this.toastService.error(error.message || 'Failed to initiate checkout. Please try again.');
            this.isProcessingCheckout = false;
            this.cdr.detectChanges();
        }
    }

    /**
     * Toggle plan selection for comparison
     */
    togglePlanForComparison(planSlug: string): void {
        const index = this.selectedPlansForComparison.indexOf(planSlug);

        if (index > -1) {
            this.selectedPlansForComparison.splice(index, 1);
        } else if (this.selectedPlansForComparison.length < 3) {
            this.selectedPlansForComparison.push(planSlug);
        } else {
            this.toastService.warning('You can compare up to 3 plans at a time');
            return;
        }

        if (this.selectedPlansForComparison.length >= 2) {
            this.loadPlanComparison();
        } else {
            this.showComparison = false;
            this.planComparison = null;
        }
    }

    /**
     * Load plan comparison data
     */
    private loadPlanComparison(): void {
        if (this.selectedPlansForComparison.length < 2) return;

        this.comparisonLoading = true;

        this.planService.comparePlans(this.selectedPlansForComparison)
            .pipe(
                takeUntil(this.destroy$),
                catchError(error => {
                    console.error('Error loading comparison:', error);
                    this.toastService.error('Failed to load plan comparison');
                    this.comparisonLoading = false;
                    return of(null);
                })
            )
            .subscribe(comparison => {
                this.planComparison = comparison;
                this.showComparison = true;
                this.comparisonLoading = false;
                this.cdr.detectChanges();
            });
    }

    /**
     * Toggle FAQ item expansion
     */
    toggleFaqItem(faqId: number): void {
        if (this.expandedFaqItems.has(faqId)) {
            this.expandedFaqItems.delete(faqId);
        } else {
            this.expandedFaqItems.add(faqId);
        }
    }

    /**
     * Handle enterprise contact form submission
     */
    submitContactForm(): void {
        if (this.contactForm.invalid) {
            this.toastService.error('Please fill in all required fields');
            return;
        }

        const formData = this.contactForm.value;

        // In a real implementation, this would send the form data to a backend service
        console.log('Enterprise contact form submitted:', formData);

        this.toastService.success('Thank you for your interest! Our enterprise team will contact you within 24 hours.');
        this.contactForm.reset();
    }

    /**
     * Check if a plan is the current user's plan
     */
    isCurrentPlan(plan: IPlan): boolean {
        return this.currentSubscription?.plan?.id === plan.id;
    }

    /**
     * Get plan features grouped by category
     */
    getFeaturesByCategory(category: string): IPlanFeature[] {
        return this.allFeatures.filter(feature => feature.category === category);
    }

    /**
     * Format plan limit for display
     */
    formatLimitValue(value: number | undefined): string {
        if (value === undefined || value === -1) {
            return 'Unlimited';
        }
        return value.toString();
    }

    /**
     * Get billing interval display text
     */
    getBillingIntervalDisplay(interval: 'month' | 'year'): string {
        return interval === 'month' ? 'Monthly' : 'Yearly';
    }

    /**
     * Get yearly savings display text
     */
    getYearlySavingsDisplay(plan: IPlan): string {
        if (plan.yearly_discount_percentage) {
            return `Save ${plan.yearly_discount_percentage}%`;
        }
        return 'Save 17%';
    }

    /**
     * Navigate to customer portal for existing subscribers
     */
    async goToCustomerPortal(): Promise<void> {
        try {
            const portalSession = await this.billingService.getCustomerPortalUrl(window.location.href).toPromise();

            if (portalSession?.url) {
                window.location.href = portalSession.url;
            } else {
                throw new Error('Failed to create portal session');
            }
        } catch (error: any) {
            console.error('Portal error:', error);
            this.toastService.error(error.message || 'Failed to open billing portal');
        }
    }

    /**
     * Get subscription status display
     */
    getSubscriptionStatusDisplay(): string {
        if (!this.currentSubscription) return '';

        const sub = this.currentSubscription.subscription;

        if (sub.is_trialing) {
            return `Trial (${sub.trial_days_remaining} days remaining)`;
        }

        return sub.status_display;
    }

    /**
     * Get plan recommendation based on team size
     */
    getRecommendedPlan(teamSize: number): IPlan | null {
        if (teamSize <= 3) {
            return this.plans.find(plan => plan.slug === 'starter') || null;
        } else if (teamSize <= 10) {
            return this.plans.find(plan => plan.slug === 'professional') || null;
        } else if (teamSize <= 50) {
            return this.plans.find(plan => plan.slug === 'business') || null;
        } else {
            return this.plans.find(plan => plan.slug === 'enterprise') || null;
        }
    }

    /**
     * Generate star rating display for testimonials
     */
    getStarRating(rating: number): string[] {
        return Array(5).fill(0).map((_, i) => i < rating ? '★' : '☆');
    }

    /**
     * Check if plan has a specific feature
     */
    planHasFeature(plan: IPlan, featureName: string): boolean {
        return plan.features.includes(featureName);
    }

    /**
     * Get plan limit value
     */
    getPlanLimit(plan: IPlan, limitName: string): number | undefined {
        return plan.limits[limitName];
    }

    /**
     * Format currency for display
     */
    formatCurrency(amount: string, currency: string, symbol: string): string {
        if (currency === 'USD') {
            return `${symbol}${amount}`;
        }
        return `${amount} ${currency}`;
    }

    /**
     * Scroll to a specific section
     */
    scrollToSection(sectionId: string): void {
        const element = document.getElementById(sectionId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    /**
     * Get plan card CSS classes
     */
    getPlanCardClasses(plan: IPlan): string {
        const classes = ['plan-card'];

        if (plan.is_popular) {
            classes.push('popular');
        }

        if (this.isCurrentPlan(plan)) {
            classes.push('current');
        }

        if (this.selectedPlansForComparison.includes(plan.slug)) {
            classes.push('selected-for-comparison');
        }

        return classes.join(' ');
    }
}