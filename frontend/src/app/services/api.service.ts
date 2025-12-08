import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
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
    IBillingSummary
} from '../models/subscription.model';

/**
 * API service provides a centralized way to make HTTP requests
 * with consistent error handling, headers, and response formatting.
 */
@Injectable({
    providedIn: 'root'
})
export class ApiService {
    private readonly baseUrl = '/api';
    private readonly defaultHeaders = new HttpHeaders({
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    });

    constructor(private http: HttpClient) { }

    /**
     * Make a GET request to the specified endpoint.
     * 
     * @param endpoint The API endpoint (without the base /api prefix)
     * @param options Optional request options
     * @returns Observable<T> The response data
     */
    get<T>(endpoint: string, options?: { params?: any; headers?: HttpHeaders }): Observable<T> {
        const url = this.buildUrl(endpoint);
        const headers = this.mergeHeaders(options?.headers);

        return this.http.get<T>(url, {
            headers,
            params: options?.params
        }).pipe(
            map(response => this.extractData(response)),
            catchError(error => this.handleError(error))
        );
    }

    /**
     * Make a POST request to the specified endpoint.
     * 
     * @param endpoint The API endpoint (without the base /api prefix)
     * @param data The request body data
     * @param options Optional request options
     * @returns Observable<T> The response data
     */
    post<T>(endpoint: string, data?: any, options?: { params?: any; headers?: HttpHeaders }): Observable<T> {
        const url = this.buildUrl(endpoint);
        const headers = this.mergeHeaders(options?.headers);

        return this.http.post<T>(url, data, {
            headers,
            params: options?.params
        }).pipe(
            map(response => this.extractData(response)),
            catchError(error => this.handleError(error))
        );
    }

    /**
     * Make a PUT request to the specified endpoint.
     * 
     * @param endpoint The API endpoint (without the base /api prefix)
     * @param data The request body data
     * @param options Optional request options
     * @returns Observable<T> The response data
     */
    put<T>(endpoint: string, data?: any, options?: { params?: any; headers?: HttpHeaders }): Observable<T> {
        const url = this.buildUrl(endpoint);
        const headers = this.mergeHeaders(options?.headers);

        return this.http.put<T>(url, data, {
            headers,
            params: options?.params
        }).pipe(
            map(response => this.extractData(response)),
            catchError(error => this.handleError(error))
        );
    }

    /**
     * Make a PATCH request to the specified endpoint.
     * 
     * @param endpoint The API endpoint (without the base /api prefix)
     * @param data The request body data
     * @param options Optional request options
     * @returns Observable<T> The response data
     */
    patch<T>(endpoint: string, data?: any, options?: { params?: any; headers?: HttpHeaders }): Observable<T> {
        const url = this.buildUrl(endpoint);
        const headers = this.mergeHeaders(options?.headers);

        return this.http.patch<T>(url, data, {
            headers,
            params: options?.params
        }).pipe(
            map(response => this.extractData(response)),
            catchError(error => this.handleError(error))
        );
    }

    /**
     * Make a DELETE request to the specified endpoint.
     * 
     * @param endpoint The API endpoint (without the base /api prefix)
     * @param options Optional request options
     * @returns Observable<T> The response data
     */
    delete<T>(endpoint: string, options?: { params?: any; headers?: HttpHeaders }): Observable<T> {
        const url = this.buildUrl(endpoint);
        const headers = this.mergeHeaders(options?.headers);

        return this.http.delete<T>(url, {
            headers,
            params: options?.params
        }).pipe(
            map(response => this.extractData(response)),
            catchError(error => this.handleError(error))
        );
    }

    /**
     * Upload a file to the specified endpoint.
     * 
     * @param endpoint The API endpoint (without the base /api prefix)
     * @param file The file to upload
     * @param additionalData Additional form data
     * @param options Optional request options
     * @returns Observable<T> The response data
     */
    upload<T>(endpoint: string, file: File, additionalData?: Record<string, any>, options?: { params?: any; headers?: HttpHeaders }): Observable<T> {
        const url = this.buildUrl(endpoint);
        const formData = new FormData();

        formData.append('file', file);

        if (additionalData) {
            Object.keys(additionalData).forEach(key => {
                formData.append(key, additionalData[key]);
            });
        }

        const headers = this.mergeHeaders(options?.headers).delete('Content-Type'); // Let browser set multipart boundary

        return this.http.post<T>(url, formData, {
            headers,
            params: options?.params
        }).pipe(
            map(response => this.extractData(response)),
            catchError(error => this.handleError(error))
        );
    }

    /**
     * Download a file from the specified endpoint.
     * 
     * @param endpoint The API endpoint (without the base /api prefix)
     * @param filename The filename to save the file as
     * @param options Optional request options
     * @returns Observable<Blob> The file data
     */
    download(endpoint: string, filename?: string, options?: { params?: any; headers?: HttpHeaders }): Observable<Blob> {
        const url = this.buildUrl(endpoint);
        const headers = this.mergeHeaders(options?.headers);

        return this.http.get(url, {
            headers,
            params: options?.params,
            responseType: 'blob'
        }).pipe(
            map(response => {
                if (filename) {
                    this.downloadFile(response, filename);
                }
                return response;
            }),
            catchError(error => this.handleError(error))
        );
    }

    /**
     * Build the full URL for an endpoint.
     */
    private buildUrl(endpoint: string): string {
        // Remove leading slash if present to avoid double slashes
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
        return `${this.baseUrl}/${cleanEndpoint}`;
    }

    /**
     * Merge default headers with provided headers.
     */
    private mergeHeaders(customHeaders?: HttpHeaders): HttpHeaders {
        if (!customHeaders) {
            return this.defaultHeaders;
        }

        return new HttpHeaders({
            ...this.defaultHeaders.keys().reduce((acc, key) => {
                acc[key] = this.defaultHeaders.get(key) || '';
                return acc;
            }, {} as Record<string, string>),
            ...customHeaders.keys().reduce((acc, key) => {
                acc[key] = customHeaders.get(key) || '';
                return acc;
            }, {} as Record<string, string>)
        });
    }

    /**
     * Extract data from API response.
     * Handles both direct data and wrapped responses.
     */
    private extractData<T>(response: T): T {
        // If response has a data property (common API pattern), return that
        if (response && typeof response === 'object' && 'data' in response) {
            return (response as any).data as T;
        }

        // Otherwise return the response directly
        return response as T;
    }

    /**
     * Handle HTTP errors and provide user-friendly messages.
     */
    private handleError(error: HttpErrorResponse): Observable<never> {
        console.error('API Error:', error);

        let errorMessage = 'An unexpected error occurred';

        if (error.error instanceof ErrorEvent) {
            // Client-side or network error
            errorMessage = `Network error: ${error.error.message}`;
        } else {
            // Backend returned an unsuccessful response code
            switch (error.status) {
                case 400:
                    errorMessage = 'Bad request. Please check your input and try again.';
                    break;
                case 401:
                    errorMessage = 'Unauthorized. Please log in again.';
                    break;
                case 403:
                    errorMessage = 'Forbidden. You do not have permission to perform this action.';
                    break;
                case 404:
                    errorMessage = 'The requested resource was not found.';
                    break;
                case 422:
                    errorMessage = this.extractValidationErrors(error.error);
                    break;
                case 429:
                    errorMessage = 'Too many requests. Please try again later.';
                    break;
                case 500:
                    errorMessage = 'Server error. Please try again later.';
                    break;
                case 503:
                    errorMessage = 'Service unavailable. Please try again later.';
                    break;
                default:
                    if (error.error?.message) {
                        errorMessage = error.error.message;
                    } else if (error.message) {
                        errorMessage = error.message;
                    }
            }
        }

        return throwError(() => new Error(errorMessage));
    }

    /**
     * Extract validation errors from a 422 response.
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
     * Trigger file download in the browser.
     */
    private downloadFile(blob: Blob, filename: string): void {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    }

    /**
     * Billing and subscription API methods
     */

    /**
     * Get current subscription details.
     *
     * @returns Observable<ISubscription> Current subscription data
     */
    getCurrentSubscription(): Observable<ISubscription> {
        return this.get<ISubscription>('billing/subscription/current');
    }

    /**
     * Create a checkout session for starting a new subscription.
     *
     * @param planId The plan ID to subscribe to
     * @param paymentMethodId Optional payment method ID
     * @returns Observable<ICheckoutSession> Checkout session data
     */
    createCheckoutSession(planId: number, paymentMethodId?: string): Observable<ICheckoutSession> {
        const payload = {
            plan_id: planId,
            payment_method_id: paymentMethodId
        };
        return this.post<ICheckoutSession>('billing/subscription/checkout', payload);
    }

    /**
     * Upgrade or downgrade subscription to a different plan.
     *
     * @param planId The new plan ID
     * @param immediate Whether to change immediately or at period end
     * @param prorate Whether to prorate the change
     * @returns Observable<ISubscription> Updated subscription data
     */
    updateSubscription(planId: number, immediate: boolean = false, prorate: boolean = true): Observable<ISubscription> {
        const payload = {
            plan_id: planId,
            immediate,
            prorate
        };
        return this.put<ISubscription>('billing/subscription/update', payload);
    }

    /**
     * Cancel subscription.
     *
     * @param immediately Whether to cancel immediately or at period end
     * @returns Observable<ISubscription> Updated subscription data
     */
    cancelSubscription(immediately: boolean = false): Observable<ISubscription> {
        const payload = {
            immediately
        };
        return this.post<ISubscription>('billing/subscription/cancel', payload);
    }

    /**
     * Resume a canceled subscription.
     *
     * @returns Observable<ISubscription> Updated subscription data
     */
    resumeSubscription(): Observable<ISubscription> {
        return this.post<ISubscription>('billing/subscription/resume');
    }

    /**
     * Get Stripe Customer Portal URL for self-service billing management.
     *
     * @param returnUrl URL to redirect to after leaving the portal
     * @returns Observable<ICustomerPortalSession> Customer portal session data
     */
    getCustomerPortalUrl(returnUrl?: string): Observable<ICustomerPortalSession> {
        const payload = returnUrl ? { return_url: returnUrl } : {};
        return this.post<ICustomerPortalSession>('billing/subscription/portal', payload);
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
        return this.get<ISubscriptionEvent[]>('billing/subscription/history', { params });
    }

    /**
     * Get current usage statistics vs plan limits.
     *
     * @returns Observable<IUsageStatistics> Current usage data
     */
    getUsageStatistics(): Observable<IUsageStatistics> {
        return this.get<IUsageStatistics>('billing/subscription/usage');
    }

    /**
     * Get billing summary for dashboard display.
     *
     * @returns Observable<IBillingSummary> Billing summary data
     */
    getBillingSummary(): Observable<IBillingSummary> {
        return this.get<IBillingSummary>('billing/summary');
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
        return this.post<IProrationCalculation>('billing/subscription/calculate-proration', payload);
    }

    /**
     * Get customer's payment methods.
     *
     * @returns Observable<IPaymentMethod[]> Array of payment methods
     */
    getPaymentMethods(): Observable<IPaymentMethod[]> {
        return this.get<IPaymentMethod[]>('billing/payment-methods');
    }

    /**
     * Add a new payment method.
     *
     * @param paymentMethodId Stripe payment method ID
     * @returns Observable<IPaymentMethod> Created payment method
     */
    addPaymentMethod(paymentMethodId: string): Observable<IPaymentMethod> {
        const payload = {
            payment_method_id: paymentMethodId
        };
        return this.post<IPaymentMethod>('billing/payment-methods', payload);
    }

    /**
     * Remove a payment method.
     *
     * @param paymentMethodId The payment method ID to remove
     * @returns Observable<void>
     */
    removePaymentMethod(paymentMethodId: string): Observable<void> {
        return this.delete<void>(`billing/payment-methods/${paymentMethodId}`);
    }

    /**
     * Set a payment method as default.
     *
     * @param paymentMethodId The payment method ID to set as default
     * @returns Observable<IPaymentMethod> Updated payment method
     */
    setDefaultPaymentMethod(paymentMethodId: string): Observable<IPaymentMethod> {
        return this.put<IPaymentMethod>(`billing/payment-methods/${paymentMethodId}/default`);
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

        return this.get<IInvoice[]>('billing/invoices', { params });
    }

    /**
     * Get billing operations history.
     *
     * @param limit Number of operations to retrieve
     * @param offset Pagination offset
     * @param operationType Optional filter by operation type
     * @returns Observable<IBillingOperation[]> Array of billing operations
     */
    getBillingOperations(limit: number = 50, offset: number = 0, operationType?: string): Observable<IBillingOperation[]> {
        const params: any = {
            limit: limit.toString(),
            offset: offset.toString()
        };

        if (operationType) {
            params.operation_type = operationType;
        }

        return this.get<IBillingOperation[]>('billing/operations', { params });
    }
}