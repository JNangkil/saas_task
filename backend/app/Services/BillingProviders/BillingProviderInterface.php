<?php

namespace App\Services\BillingProviders;

use App\Models\Tenant;
use App\Models\Plan;
use App\Models\Subscription;

/**
 * Interface for billing providers.
 * 
 * This interface defines the contract that all billing providers must implement.
 * It provides a standardized way to interact with different billing services
 * like Stripe, PayPal, etc.
 */
interface BillingProviderInterface
{
    /**
     * Create a new customer in the billing system.
     *
     * @param Tenant $tenant The tenant to create a customer for
     * @param array $data Additional customer data
     * @return array Customer data from the billing provider
     * @throws \Exception If customer creation fails
     */
    public function createCustomer(Tenant $tenant, array $data): array;

    /**
     * Create a new subscription for a tenant.
     *
     * @param Tenant $tenant The tenant to create a subscription for
     * @param Plan $plan The plan to subscribe to
     * @param string $paymentMethodId The payment method ID to use
     * @return array Subscription data from the billing provider
     * @throws \Exception If subscription creation fails
     */
    public function createSubscription(Tenant $tenant, Plan $plan, string $paymentMethodId): array;

    /**
     * Cancel an existing subscription.
     *
     * @param Subscription $subscription The subscription to cancel
     * @param bool $immediately Whether to cancel immediately or at period end
     * @return array Updated subscription data from the billing provider
     * @throws \Exception If cancellation fails
     */
    public function cancelSubscription(Subscription $subscription, bool $immediately = false): array;

    /**
     * Update an existing subscription to a new plan.
     *
     * @param Subscription $subscription The subscription to update
     * @param Plan $newPlan The new plan to update to
     * @param array $options Additional options for the update
     * @return array Updated subscription data from the billing provider
     * @throws \Exception If update fails
     */
    public function updateSubscription(Subscription $subscription, Plan $newPlan, array $options = []): array;

    /**
     * Resume a paused subscription.
     *
     * @param Subscription $subscription The subscription to resume
     * @return array Updated subscription data from the billing provider
     * @throws \Exception If resume fails
     */
    public function resumeSubscription(Subscription $subscription): array;

    /**
     * Retrieve customer data from the billing provider.
     *
     * @param string $customerId The customer ID in the billing system
     * @return array Customer data from the billing provider
     * @throws \Exception If customer retrieval fails
     */
    public function getCustomer(string $customerId): array;

    /**
     * Retrieve subscription data from the billing provider.
     *
     * @param string $subscriptionId The subscription ID in the billing system
     * @return array Subscription data from the billing provider
     * @throws \Exception If subscription retrieval fails
     */
    public function getSubscription(string $subscriptionId): array;

    /**
     * Create a checkout session for a one-time payment or subscription.
     *
     * @param Tenant $tenant The tenant creating the checkout session
     * @param Plan $plan The plan being purchased
     * @param array $options Additional options for the checkout session
     * @return array Checkout session data from the billing provider
     * @throws \Exception If checkout session creation fails
     */
    public function createCheckoutSession(Tenant $tenant, Plan $plan, array $options = []): array;

    /**
     * Create a customer portal session for managing subscriptions.
     *
     * @param string $customerId The customer ID in the billing system
     * @param array $options Additional options for the portal session
     * @return array Portal session data from the billing provider
     * @throws \Exception If portal session creation fails
     */
    public function createPortalSession(string $customerId, array $options = []): array;

    /**
     * Verify a webhook signature from the billing provider.
     *
     * @param string $payload The raw webhook payload
     * @param string $signature The webhook signature
     * @param string $secret The webhook secret (optional, uses default if not provided)
     * @return bool True if signature is valid, false otherwise
     */
    public function verifyWebhookSignature(string $payload, string $signature, ?string $secret = null): bool;
}