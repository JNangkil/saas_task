import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { catchError, map, tap, shareReplay, switchMap } from 'rxjs/operators';
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

// Stripe.js type definitions
declare var Stripe: (key: string) => {
    elements: (options?: any) => any;
    createPaymentMethod: (options: any) => Promise<any>;
    confirmCardPayment: (clientSecret: string, options?: any) => Promise<any>;
    redirectToCheckout: (options: any) => Promise<any>;
};

/**
 * BillingService handles all subscription and billing operations including
 * payment processing with Stripe, subscription management, and usage tracking.
 */
@Injectable({
    providedIn: 'root'
})
export class BillingService {
    private readonly baseUrl = '/api/billing';
    private readonly httpOptions = {
        headers: new HttpHeaders({
            'Content-Type': 'application/json'
        })
    };

    // Cache for subscription data
    private subscriptionCache = new BehaviorSubject<ISubscription | null>(null);
    public currentSubscription$ = this.subscriptionCache.asObservable();

    // Loading states
    private loadingSubject = new BehaviorSubject<boolean>(false);
    public loading$ = this.loadingSubject.asObservable();

    // Stripe instance
    private stripe: any = null;

    constructor(
        private http: HttpClient,
        private apiService: ApiService
    ) {
        this.initializeStripe();
    }

    /**
     * Initialize Stripe.js with the publishable key
     */
    private initializeStripe(): void {
        // In a real implementation, you would get this from environment variables
        const stripePublishableKey = 'pk_test_example'; // Replace with actual key
        if (typeof Stripe !== 'undefined') {
            this.stripe = Stripe(stripePublishableKey);
        }
    }

    /**
     * Get current subscription details.
     * 
     * @returns Observable<ISubscription> Current subscription data
     */
    getCurrentSubscription(): Observable<ISubscription> {
        this.setLoading(true);

        return this.apiService.get<ISubscription>('subscription/current').pipe(
            tap(subscription => {
                this.subscriptionCache.next(subscription);
                this.setLoading(false);
            }),
            catchError(error => {
                this.setLoading(false);
                return this.handleError('Failed to fetch current subscription', error);
            }),
            shareReplay(1)
        );
    }

    /**
     * Create a checkout session for starting a new subscription.
     * 
     * @param planId The plan ID to subscribe to
     * @param paymentMethodId Optional payment method ID
     * @returns Observable<ICheckoutSession> Checkout session data
     */
    createCheckoutSession(planId: number, paymentMethodId?: string): Observable<ICheckoutSession> {
        this.setLoading(true);

        const payload = {
            plan_id: planId,
            payment_method_id: paymentMethodId
        };

        return this.apiService.post<ICheckoutSession>('subscription/checkout', payload).pipe(
            tap(session => {
                this.setLoading(false);
            }),
            catchError(error => {
                this.setLoading(false);
                return this.handleError('Failed to create checkout session', error);
            })
        );
    }

    /**
     * Upgrade or downgrade subscription to a different plan.
     * 
     * @param planId The new plan ID
     * @param immediate Whether to change immediately or at period end
     * @param prorate Whether to prorate the change
     * @returns Observable<ISubscription> Updated subscription data
     */
    upgradeSubscription(planId: number, immediate: boolean = false, prorate: boolean = true): Observable<ISubscription> {
        this.setLoading(true);

        const payload = {
            plan_id: planId,
            immediate,
            prorate
        };

        return this.apiService.put<ISubscription>('subscription/update', payload).pipe(
            tap(subscription => {
                this.subscriptionCache.next(subscription);
                this.setLoading(false);
            }),
            catchError(error => {
                this.setLoading(false);
                return this.handleError('Failed to update subscription', error);
            })
        );
    }

    /**
     * Cancel subscription.
     * 
     * @param immediately Whether to cancel immediately or at period end
     * @returns Observable<ISubscription> Updated subscription data
     */
    cancelSubscription(immediately: boolean = false): Observable<ISubscription> {
        this.setLoading(true);

        const payload = {
            immediately
        };

        return this.apiService.post<ISubscription>('subscription/cancel', payload).pipe(
            tap(subscription => {
                this.subscriptionCache.next(subscription);
                this.setLoading(false);
            }),
            catchError(error => {
                this.setLoading(false);
                return this.handleError('Failed to cancel subscription', error);
            })
        );
    }

    /**
     * Resume a canceled subscription.
     * 
     * @returns Observable<ISubscription> Updated subscription data
     */
    resumeSubscription(): Observable<ISubscription> {
        this.setLoading(true);

        return this.apiService.post<ISubscription>('subscription/resume').pipe(
            tap(subscription => {
                this.subscriptionCache.next(subscription);
                this.setLoading(false);
            }),
            catchError(error => {
                this.setLoading(false);
                return this.handleError('Failed to resume subscription', error);
            })
        );
    }

    /**
     * Get Stripe Customer Portal URL for self-service billing management.
     * 
     * @param returnUrl URL to redirect to after leaving the portal
     * @returns Observable<ICustomerPortalSession> Customer portal session data
     */
    getCustomerPortalUrl(returnUrl?: string): Observable<ICustomerPortalSession> {
        this.setLoading(true);

        const payload = returnUrl ? { return_url: returnUrl } : {};

        return this.apiService.post<ICustomerPortalSession>('subscription/portal', payload).pipe(
            tap(() => {
                this.setLoading(false);
            }),
            catchError(error => {
                this.setLoading(false);
                return this.handleError('Failed to create customer portal session', error);
            })
        );
    }

    /**
     * Get subscription events/history.
     * 
     * @param limit Number of events to retrieve
     * @param offset Pagination offset
     * @returns Observable<ISubscriptionEvent[]> Array of subscription events
     */
    getSubscriptionHistory(limit: number = 50, offset: number = 0): Observable<ISubscriptionEvent[]> {
        const params = {
            limit: limit.toString(),
            offset: offset.toString()
        };

        return this.apiService.get<ISubscriptionEvent[]>('subscription/history', { params }).pipe(
            catchError(error => this.handleError('Failed to fetch subscription history', error))
        );
    }

    /**
     * Get current usage statistics vs plan limits.
     * 
     * @returns Observable<IUsageStatistics> Current usage data
     */
    getUsageStatistics(): Observable<IUsageStatistics> {
        return this.apiService.get<IUsageStatistics>('subscription/usage').pipe(
            catchError(error => this.handleError('Failed to fetch usage statistics', error))
        );
    }

    /**
     * Get billing summary for dashboard display.
     * 
     * @returns Observable<IBillingSummary> Billing summary data
     */
    getBillingSummary(): Observable<IBillingSummary> {
        this.setLoading(true);

        return this.apiService.get<IBillingSummary>('billing/summary').pipe(
            tap(() => {
                this.setLoading(false);
            }),
            catchError(error => {
                this.setLoading(false);
                return this.handleError('Failed to fetch billing summary', error);
            })
        );
    }

    /**
     * Calculate proration for subscription changes.
     * 
     * @param newPlanId The new plan ID
     * @param immediate Whether to change immediately
     * @returns Observable<IProrationCalculation> Proration calculation data
     */
    calculateProration(newPlanId: number, immediate: boolean = false): Observable<IProrationCalculation> {
        const payload = {
            new_plan_id: newPlanId,
            immediate
        };

        return this.apiService.post<IProrationCalculation>('subscription/calculate-proration', payload).pipe(
            catchError(error => this.handleError('Failed to calculate proration', error))
        );
    }

    /**
     * Get customer's payment methods.
     * 
     * @returns Observable<IPaymentMethod[]> Array of payment methods
     */
    getPaymentMethods(): Observable<IPaymentMethod[]> {
        return this.apiService.get<IPaymentMethod[]>('billing/payment-methods').pipe(
            catchError(error => this.handleError('Failed to fetch payment methods', error))
        );
    }

    /**
     * Add a new payment method using Stripe Elements.
     * 
     * @param cardElement Stripe Elements card element
     * @param billingAddress Billing address details
     * @returns Observable<IPaymentMethod> Created payment method
     */
    addPaymentMethod(cardElement: any, billingAddress?: any): Observable<IPaymentMethod> {
        if (!this.stripe) {
            return throwError(() => new Error('Stripe is not initialized'));
        }

        this.setLoading(true);

        return this.createPaymentMethod(cardElement, billingAddress).pipe(
            switchMap(paymentMethod => {
                return this.apiService.post<IPaymentMethod>('billing/payment-methods', {
                    payment_method_id: paymentMethod.id
                });
            }),
            tap(paymentMethod => {
                this.setLoading(false);
            }),
            catchError(error => {
                this.setLoading(false);
                return this.handleError('Failed to add payment method', error);
            })
        );
    }

    /**
     * Remove a payment method.
     * 
     * @param paymentMethodId The payment method ID to remove
     * @returns Observable<void>
     */
    removePaymentMethod(paymentMethodId: string): Observable<void> {
        this.setLoading(true);

        return this.apiService.delete<void>(`billing/payment-methods/${paymentMethodId}`).pipe(
            tap(() => {
                this.setLoading(false);
            }),
            catchError(error => {
                this.setLoading(false);
                return this.handleError('Failed to remove payment method', error);
            })
        );
    }

    /**
     * Set a payment method as default.
     * 
     * @param paymentMethodId The payment method ID to set as default
     * @returns Observable<IPaymentMethod> Updated payment method
     */
    setDefaultPaymentMethod(paymentMethodId: string): Observable<IPaymentMethod> {
        this.setLoading(true);

        return this.apiService.put<IPaymentMethod>(`billing/payment-methods/${paymentMethodId}/default`).pipe(
            tap(() => {
                this.setLoading(false);
            }),
            catchError(error => {
                this.setLoading(false);
                return this.handleError('Failed to set default payment method', error);
            })
        );
    }

    /**
     * Get invoice history.
     * 
     * @param limit Number of invoices to retrieve
     * @param startingAfter Invoice ID to start after (for pagination)
     * @returns Observable<IInvoice[]> Array of invoices
     */
    getInvoices(limit: number = 50, startingAfter?: string): Observable<IInvoice[]> {
        const params: any = {
            limit: limit.toString()
        };

        if (startingAfter) {
            params.starting_after = startingAfter;
        }

        return this.apiService.get<IInvoice[]>('billing/invoices', { params }).pipe(
            catchError(error => this.handleError('Failed to fetch invoices', error))
        );
    }

    /**
     * Get billing operations history.
     * 
     * @param limit Number of operations to retrieve
     * @param offset Pagination offset
     * @param operationType Optional filter by operation type
     * @returns Observable<IBillingOperation[]> Array of billing operations
     */
    getBillingOperations(limit: number = 50, offset: number = 0, operationType?: BillingOperationType): Observable<IBillingOperation[]> {
        const params: any = {
            limit: limit.toString(),
            offset: offset.toString()
        };

        if (operationType) {
            params.operation_type = operationType;
        }

        return this.apiService.get<IBillingOperation[]>('billing/operations', { params }).pipe(
            catchError(error => this.handleError('Failed to fetch billing operations', error))
        );
    }

    /**
     * Redirect to Stripe Checkout for payment.
     * 
     * @param sessionId Checkout session ID
     * @returns Promise<void>
     */
    async redirectToCheckout(sessionId: string): Promise<void> {
        if (!this.stripe) {
            throw new Error('Stripe is not initialized');
        }

        try {
            const result = await this.stripe.redirectToCheckout({
                sessionId
            });

            if (result.error) {
                throw new Error(result.error.message);
            }
        } catch (error) {
            throw new Error('Failed to redirect to checkout');
        }
    }

    /**
     * Create a payment method using Stripe.js.
     * 
     * @param cardElement Stripe Elements card element
     * @param billingAddress Billing address details
     * @returns Observable<any> Payment method data
     */
    private createPaymentMethod(cardElement: any, billingAddress?: any): Observable<any> {
        if (!this.stripe) {
            return throwError(() => new Error('Stripe is not initialized'));
        }

        const paymentMethodData: any = {
            type: 'card',
            card: cardElement
        };

        if (billingAddress) {
            paymentMethodData.billing_details = billingAddress;
        }

        return new Observable(observer => {
            this.stripe.createPaymentMethod(paymentMethodData).then((result: any) => {
                if (result.error) {
                    observer.error(result.error);
                } else {
                    observer.next(result.paymentMethod);
                    observer.complete();
                }
            }).catch((error: any) => {
                observer.error(error);
            });
        });
    }

    /**
     * Set loading state.
     * 
     * @param loading Whether the service is currently loading
     */
    private setLoading(loading: boolean): void {
        this.loadingSubject.next(loading);
    }

    /**
     * Handle HTTP errors with user-friendly messages.
     * 
     * @param message Base error message
     * @param error HTTP error response
     * @returns Observable<never> Error observable
     */
    private handleError(message: string, error: any): Observable<never> {
        console.error(message, error);

        let errorMessage = message;

        if (error.status === 400) {
            errorMessage = 'Invalid request. Please check your input and try again.';
        } else if (error.status === 401) {
            errorMessage = 'Unauthorized. Please log in again.';
        } else if (error.status === 403) {
            errorMessage = 'Forbidden. You do not have permission to perform this action.';
        } else if (error.status === 404) {
            errorMessage = 'The requested resource was not found.';
        } else if (error.status === 422) {
            errorMessage = this.extractValidationErrors(error.error);
        } else if (error.status === 429) {
            errorMessage = 'Too many requests. Please try again later.';
        } else if (error.status === 500) {
            errorMessage = 'Server error. Please try again later.';
        } else if (error.status === 503) {
            errorMessage = 'Service unavailable. Please try again later.';
        } else if (error.error?.message) {
            errorMessage = error.error.message;
        } else if (error.message) {
            errorMessage = error.message;
        }

        return throwError(() => new Error(errorMessage));
    }

    /**
     * Extract validation errors from a 422 response.
     * 
     * @param error Error response object
     * @returns string Formatted validation error message
     */
    private extractValidationErrors(error: any): string {
        if (error?.errors && typeof error.errors === 'object') {
            const errors = Object.values(error.errors).flat();
            return errors.join(', ');
        }

        if (error?.message) {
            return error.message;
        }

        return 'Validation failed. Please check your input.';
    }

    /**
     * Clear cached subscription data.
     * Useful when user logs out or subscription data is updated elsewhere.
     */
    clearCache(): void {
        this.subscriptionCache.next(null);
    }

    /**
     * Refresh current subscription data.
     * 
     * @returns Observable<ISubscription> Updated subscription data
     */
    refreshSubscription(): Observable<ISubscription> {
        return this.getCurrentSubscription();
    }
}