/**
 * Subscription model and related interfaces for billing operations.
 * These interfaces define the structure of subscription data and related entities.
 */

import { IPlan } from './plan.model';

/**
 * Main Subscription interface representing a tenant's subscription
 */
export interface ISubscription {
    id: number;
    tenant_id: number;
    plan_id: number;
    stripe_subscription_id?: string;
    status: SubscriptionStatus;
    status_display: string;
    trial_ends_at?: string;
    ends_at?: string;
    current_period_start?: string;
    current_period_end?: string;
    cancel_at_period_end: boolean;
    is_trialing: boolean;
    is_active: boolean;
    is_past_due: boolean;
    is_canceled: boolean;
    is_expired: boolean;
    is_within_grace_period: boolean;
    trial_days_remaining: number;
    days_remaining?: number;
    created_at: string;
    updated_at: string;
    metadata?: Record<string, any>;
    plan?: IPlan;
}

/**
 * Subscription status enumeration
 */
export type SubscriptionStatus =
    | 'trialing'
    | 'active'
    | 'past_due'
    | 'canceled'
    | 'unpaid'
    | 'incomplete'
    | 'incomplete_expired'
    | 'expired';

/**
 * Subscription event interface for tracking subscription history
 */
export interface ISubscriptionEvent {
    id: number;
    subscription_id: number;
    event_type: SubscriptionEventType;
    event_type_display: string;
    description: string;
    properties?: Record<string, any>;
    created_at: string;
    updated_at: string;
}

/**
 * Subscription event type enumeration
 */
export type SubscriptionEventType =
    | 'created'
    | 'updated'
    | 'canceled'
    | 'resumed'
    | 'payment_succeeded'
    | 'payment_failed'
    | 'trial_started'
    | 'trial_ended'
    | 'plan_changed'
    | 'grace_period_started'
    | 'grace_period_ended';

/**
 * Usage statistics interface for tracking current usage vs limits
 */
export interface IUsageStatistics {
    current_usage: {
        users: number;
        workspaces: number;
        boards: number;
        storage_mb?: number;
        api_calls_this_month?: number;
        [key: string]: number | undefined;
    };
    limits: {
        max_users?: number;
        max_workspaces?: number;
        max_boards?: number;
        max_storage_mb?: number;
        max_api_calls_per_month?: number;
        [key: string]: number | undefined;
    };
    usage_percentage: {
        users: number;
        workspaces: number;
        boards: number;
        storage_mb?: number;
        api_calls_this_month?: number;
        [key: string]: number | undefined;
    };
    is_over_limit: {
        users: boolean;
        workspaces: boolean;
        boards: boolean;
        storage_mb?: boolean;
        api_calls_this_month?: boolean;
        [key: string]: boolean | undefined;
    };
    remaining: {
        users: number;
        workspaces: number;
        boards: number;
        storage_mb?: number;
        api_calls_this_month?: number;
        [key: string]: number | undefined;
    };
    last_calculated: string;
}

/**
 * Checkout session interface for Stripe payment processing
 */
export interface ICheckoutSession {
    id: string;
    session_id: string;
    customer_id?: string;
    subscription_id?: string;
    plan_id: number;
    payment_method_id?: string;
    success_url: string;
    cancel_url: string;
    mode: 'subscription' | 'payment' | 'setup';
    status: 'open' | 'complete' | 'expired';
    payment_status?: 'paid' | 'unpaid' | 'no_payment_required';
    amount_total?: number;
    currency?: string;
    customer_email?: string;
    trial_period_days?: number;
    metadata?: Record<string, any>;
    created_at: string;
    expires_at: string;
}

/**
 * Billing operation interface for tracking billing operations
 */
export interface IBillingOperation {
    id: string;
    operation_type: BillingOperationType;
    operation_type_display: string;
    status: BillingOperationStatus;
    status_display: string;
    description: string;
    subscription_id?: number;
    plan_id?: number;
    amount?: number;
    currency?: string;
    error_message?: string;
    metadata?: Record<string, any>;
    created_at: string;
    completed_at?: string;
}

/**
 * Billing operation type enumeration
 */
export type BillingOperationType =
    | 'create_subscription'
    | 'update_subscription'
    | 'cancel_subscription'
    | 'resume_subscription'
    | 'create_checkout_session'
    | 'create_customer_portal_session'
    | 'process_payment'
    | 'refund_payment'
    | 'update_payment_method';

/**
 * Billing operation status enumeration
 */
export type BillingOperationStatus =
    | 'pending'
    | 'processing'
    | 'completed'
    | 'failed'
    | 'canceled';

/**
 * Customer portal session interface for Stripe Customer Portal
 */
export interface ICustomerPortalSession {
    id: string;
    session_id: string;
    customer_id: string;
    return_url: string;
    url: string;
    created_at: string;
    expires_at: string;
}

/**
 * Proration calculation interface for subscription changes
 */
export interface IProrationCalculation {
    proration_amount: number;
    proration_date: string;
    currency: string;
    line_items: IProrationLineItem[];
    credit_amount: number;
    debit_amount: number;
    net_amount: number;
}

/**
 * Proration line item interface
 */
export interface IProrationLineItem {
    description: string;
    amount: number;
    period_start: string;
    period_end: string;
    quantity?: number;
    unit_amount?: number;
    type: 'invoice' | 'credit';
}

/**
 * Payment method interface
 */
export interface IPaymentMethod {
    id: string;
    type: 'card' | 'bank_account';
    card?: IPaymentMethodCard;
    bank_account?: IPaymentMethodBankAccount;
    is_default: boolean;
    created_at: string;
    metadata?: Record<string, any>;
}

/**
 * Payment method card details interface
 */
export interface IPaymentMethodCard {
    brand: 'visa' | 'mastercard' | 'amex' | 'discover' | 'jcb' | 'unionpay' | 'diners' | 'unknown';
    last4: string;
    exp_month: number;
    exp_year: number;
    fingerprint: string;
    funding: 'credit' | 'debit' | 'prepaid' | 'unknown';
    country?: string;
    three_d_secure_usage?: {
        supported: boolean;
    };
}

/**
 * Payment method bank account details interface
 */
export interface IPaymentMethodBankAccount {
    bank_name: string;
    last4: string;
    country: string;
    currency: string;
    fingerprint: string;
    routing_number?: string;
    account_holder_name?: string;
    account_holder_type?: 'individual' | 'company';
}

/**
 * Invoice interface for billing history
 */
export interface IInvoice {
    id: string;
    number: string;
    status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
    amount_due: number;
    amount_paid: number;
    amount_remaining: number;
    currency: string;
    due_date?: string;
    period_start: string;
    period_end: string;
    created_at: string;
    finalized_at?: string;
    paid_at?: string;
    hosted_invoice_url?: string;
    invoice_pdf?: string;
    subscription?: string;
    customer?: string;
    description?: string;
    metadata?: Record<string, any>;
    lines: IInvoiceLineItem[];
}

/**
 * Invoice line item interface
 */
export interface IInvoiceLineItem {
    id: string;
    description: string;
    amount: number;
    currency: string;
    quantity?: number;
    unit_amount?: number;
    period: {
        start: string;
        end: string;
    };
    type: 'invoiceitem' | 'subscription';
    proration: boolean;
    subscription?: string;
    metadata?: Record<string, any>;
}

/**
 * Billing summary interface for dashboard display
 */
export interface IBillingSummary {
    subscription: ISubscription;
    usage: IUsageStatistics;
    upcoming_invoice?: IInvoice;
    payment_methods: IPaymentMethod[];
    has_payment_method: boolean;
    is_payment_method_required: boolean;
    next_billing_date?: string;
    next_billing_amount?: number;
    days_until_next_billing?: number;
    trial_days_remaining?: number;
    is_trial_active: boolean;
    is_canceled: boolean;
    cancel_at_period_end: boolean;
    can_resume: boolean;
    can_change_plan: boolean;
    can_cancel: boolean;
}