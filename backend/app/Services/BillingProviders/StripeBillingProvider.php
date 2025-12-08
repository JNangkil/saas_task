<?php

namespace App\Services\BillingProviders;

use App\Models\Tenant;
use App\Models\Plan;
use App\Models\Subscription;
use Illuminate\Support\Facades\Log;
use Stripe\Stripe;
use Stripe\Customer;
use Stripe\Subscription as StripeSubscription;
use Stripe\Checkout\Session;
use Stripe\BillingPortal\Session as PortalSession;
use Stripe\Webhook;
use Stripe\Exception\ApiErrorException;
use Stripe\Exception\CardException;
use Stripe\Exception\InvalidRequestException;
use Exception;

/**
 * Stripe implementation of the BillingProviderInterface.
 * 
 * This class provides integration with Stripe's billing services
 * for managing customers, subscriptions, and payments.
 */
class StripeBillingProvider implements BillingProviderInterface
{
    /**
     * Create a new Stripe billing provider instance.
     */
    public function __construct()
    {
        $this->configureStripe();
    }

    /**
     * Configure Stripe with API keys.
     */
    private function configureStripe(): void
    {
        Stripe::setApiKey(config('services.stripe.secret'));
        Stripe::setApiVersion(config('services.stripe.api_version', '2023-10-16'));
    }

    /**
     * {@inheritdoc}
     */
    public function createCustomer(Tenant $tenant, array $data): array
    {
        try {
            $customerData = array_merge([
                'name' => $tenant->name,
                'email' => $tenant->billing_email,
                'metadata' => [
                    'tenant_id' => $tenant->id,
                    'tenant_slug' => $tenant->slug,
                ],
            ], $data);

            $customer = Customer::create($customerData);

            Log::info('Stripe customer created', [
                'tenant_id' => $tenant->id,
                'customer_id' => $customer->id,
            ]);

            return $customer->toArray();
        } catch (ApiErrorException $e) {
            Log::error('Failed to create Stripe customer', [
                'tenant_id' => $tenant->id,
                'error' => $e->getMessage(),
            ]);

            throw new Exception('Failed to create customer: ' . $e->getMessage(), 0, $e);
        }
    }

    /**
     * {@inheritdoc}
     */
    public function createSubscription(Tenant $tenant, Plan $plan, string $paymentMethodId): array
    {
        try {
            // Ensure customer exists in Stripe
            $customerId = $tenant->stripe_customer_id;
            if (!$customerId) {
                $customer = $this->createCustomer($tenant, []);
                $customerId = $customer['id'];
                
                // Update tenant with Stripe customer ID
                $tenant->update(['stripe_customer_id' => $customerId]);
            }

            // Attach payment method to customer
            $this->attachPaymentMethod($customerId, $paymentMethodId);

            // Create subscription
            $subscriptionData = [
                'customer' => $customerId,
                'items' => [
                    [
                        'price' => $plan->stripe_price_id,
                        'quantity' => 1,
                    ],
                ],
                'payment_behavior' => 'default_incomplete',
                'payment_settings' => [
                    'save_default_payment_method' => 'on_subscription',
                ],
                'expand' => ['latest_invoice.payment_intent'],
                'metadata' => [
                    'tenant_id' => $tenant->id,
                    'plan_id' => $plan->id,
                ],
            ];

            // Add trial period if specified
            if ($plan->trial_days > 0) {
                $subscriptionData['trial_period_days'] = $plan->trial_days;
            }

            $stripeSubscription = StripeSubscription::create($subscriptionData);

            Log::info('Stripe subscription created', [
                'tenant_id' => $tenant->id,
                'plan_id' => $plan->id,
                'subscription_id' => $stripeSubscription->id,
            ]);

            return $stripeSubscription->toArray();
        } catch (ApiErrorException $e) {
            Log::error('Failed to create Stripe subscription', [
                'tenant_id' => $tenant->id,
                'plan_id' => $plan->id,
                'error' => $e->getMessage(),
            ]);

            throw new Exception('Failed to create subscription: ' . $e->getMessage(), 0, $e);
        }
    }

    /**
     * {@inheritdoc}
     */
    public function cancelSubscription(Subscription $subscription, bool $immediately = false): array
    {
        try {
            $stripeSubscription = StripeSubscription::retrieve($subscription->stripe_subscription_id);

            if ($immediately) {
                $canceledSubscription = $stripeSubscription->cancel();
            } else {
                $canceledSubscription = $stripeSubscription->cancel([
                    'at_period_end' => true,
                ]);
            }

            Log::info('Stripe subscription canceled', [
                'subscription_id' => $subscription->id,
                'stripe_subscription_id' => $subscription->stripe_subscription_id,
                'immediately' => $immediately,
            ]);

            return $canceledSubscription->toArray();
        } catch (ApiErrorException $e) {
            Log::error('Failed to cancel Stripe subscription', [
                'subscription_id' => $subscription->id,
                'stripe_subscription_id' => $subscription->stripe_subscription_id,
                'error' => $e->getMessage(),
            ]);

            throw new Exception('Failed to cancel subscription: ' . $e->getMessage(), 0, $e);
        }
    }

    /**
     * {@inheritdoc}
     */
    public function updateSubscription(Subscription $subscription, Plan $newPlan, array $options = []): array
    {
        try {
            $stripeSubscription = StripeSubscription::retrieve($subscription->stripe_subscription_id);

            $updateData = [
                'items' => [
                    [
                        'id' => $stripeSubscription->items->data[0]->id,
                        'price' => $newPlan->stripe_price_id,
                    ],
                ],
                'metadata' => [
                    'tenant_id' => $subscription->tenant_id,
                    'plan_id' => $newPlan->id,
                ],
            ];

            // Handle proration
            if (isset($options['proration_behavior'])) {
                $updateData['proration_behavior'] = $options['proration_behavior'];
            } else {
                $updateData['proration_behavior'] = 'create_prorations';
            }

            $updatedSubscription = $stripeSubscription->update($subscription->stripe_subscription_id, $updateData);

            Log::info('Stripe subscription updated', [
                'subscription_id' => $subscription->id,
                'stripe_subscription_id' => $subscription->stripe_subscription_id,
                'new_plan_id' => $newPlan->id,
            ]);

            return $updatedSubscription->toArray();
        } catch (ApiErrorException $e) {
            Log::error('Failed to update Stripe subscription', [
                'subscription_id' => $subscription->id,
                'stripe_subscription_id' => $subscription->stripe_subscription_id,
                'new_plan_id' => $newPlan->id,
                'error' => $e->getMessage(),
            ]);

            throw new Exception('Failed to update subscription: ' . $e->getMessage(), 0, $e);
        }
    }

    /**
     * {@inheritdoc}
     */
    public function resumeSubscription(Subscription $subscription): array
    {
        try {
            $stripeSubscription = StripeSubscription::retrieve($subscription->stripe_subscription_id);

            if ($stripeSubscription->pause_collection) {
                $resumedSubscription = $stripeSubscription->update($subscription->stripe_subscription_id, [
                    'pause_collection' => null,
                ]);

                Log::info('Stripe subscription resumed', [
                    'subscription_id' => $subscription->id,
                    'stripe_subscription_id' => $subscription->stripe_subscription_id,
                ]);

                return $resumedSubscription->toArray();
            }

            return $stripeSubscription->toArray();
        } catch (ApiErrorException $e) {
            Log::error('Failed to resume Stripe subscription', [
                'subscription_id' => $subscription->id,
                'stripe_subscription_id' => $subscription->stripe_subscription_id,
                'error' => $e->getMessage(),
            ]);

            throw new Exception('Failed to resume subscription: ' . $e->getMessage(), 0, $e);
        }
    }

    /**
     * {@inheritdoc}
     */
    public function getCustomer(string $customerId): array
    {
        try {
            $customer = Customer::retrieve($customerId, [
                'expand' => ['subscriptions'],
            ]);

            return $customer->toArray();
        } catch (ApiErrorException $e) {
            Log::error('Failed to retrieve Stripe customer', [
                'customer_id' => $customerId,
                'error' => $e->getMessage(),
            ]);

            throw new Exception('Failed to retrieve customer: ' . $e->getMessage(), 0, $e);
        }
    }

    /**
     * {@inheritdoc}
     */
    public function getSubscription(string $subscriptionId): array
    {
        try {
            $subscription = StripeSubscription::retrieve($subscriptionId, [
                'expand' => ['customer', 'latest_invoice.payment_intent'],
            ]);

            return $subscription->toArray();
        } catch (ApiErrorException $e) {
            Log::error('Failed to retrieve Stripe subscription', [
                'subscription_id' => $subscriptionId,
                'error' => $e->getMessage(),
            ]);

            throw new Exception('Failed to retrieve subscription: ' . $e->getMessage(), 0, $e);
        }
    }

    /**
     * {@inheritdoc}
     */
    public function createCheckoutSession(Tenant $tenant, Plan $plan, array $options = []): array
    {
        try {
            // Ensure customer exists in Stripe
            $customerId = $tenant->stripe_customer_id;
            if (!$customerId) {
                $customer = $this->createCustomer($tenant, []);
                $customerId = $customer['id'];
                
                // Update tenant with Stripe customer ID
                $tenant->update(['stripe_customer_id' => $customerId]);
            }

            $sessionData = [
                'customer' => $customerId,
                'payment_method_types' => ['card'],
                'line_items' => [
                    [
                        'price' => $plan->stripe_price_id,
                        'quantity' => 1,
                    ],
                ],
                'mode' => 'subscription',
                'success_url' => $options['success_url'] ?? config('app.url') . '/billing/success?session_id={CHECKOUT_SESSION_ID}',
                'cancel_url' => $options['cancel_url'] ?? config('app.url') . '/billing/cancel',
                'metadata' => [
                    'tenant_id' => $tenant->id,
                    'plan_id' => $plan->id,
                ],
            ];

            // Add trial period if specified
            if ($plan->trial_days > 0) {
                $sessionData['subscription_data'] = [
                    'trial_period_days' => $plan->trial_days,
                ];
            }

            // Allow overriding of customer email if not already set
            if (!empty($options['customer_email']) && !$tenant->billing_email) {
                $sessionData['customer_email'] = $options['customer_email'];
            }

            $checkoutSession = Session::create($sessionData);

            Log::info('Stripe checkout session created', [
                'tenant_id' => $tenant->id,
                'plan_id' => $plan->id,
                'session_id' => $checkoutSession->id,
            ]);

            return $checkoutSession->toArray();
        } catch (ApiErrorException $e) {
            Log::error('Failed to create Stripe checkout session', [
                'tenant_id' => $tenant->id,
                'plan_id' => $plan->id,
                'error' => $e->getMessage(),
            ]);

            throw new Exception('Failed to create checkout session: ' . $e->getMessage(), 0, $e);
        }
    }

    /**
     * {@inheritdoc}
     */
    public function createPortalSession(string $customerId, array $options = []): array
    {
        try {
            $sessionData = [
                'customer' => $customerId,
                'return_url' => $options['return_url'] ?? config('app.url') . '/billing',
            ];

            $portalSession = PortalSession::create($sessionData);

            Log::info('Stripe portal session created', [
                'customer_id' => $customerId,
                'session_id' => $portalSession->id,
            ]);

            return $portalSession->toArray();
        } catch (ApiErrorException $e) {
            Log::error('Failed to create Stripe portal session', [
                'customer_id' => $customerId,
                'error' => $e->getMessage(),
            ]);

            throw new Exception('Failed to create portal session: ' . $e->getMessage(), 0, $e);
        }
    }

    /**
     * {@inheritdoc}
     */
    public function verifyWebhookSignature(string $payload, string $signature, ?string $secret = null): bool
    {
        try {
            $webhookSecret = $secret ?? config('services.stripe.webhook_secret');
            
            if (!$webhookSecret) {
                Log::error('Stripe webhook secret not configured');
                return false;
            }

            $event = Webhook::constructEvent(
                $payload,
                $signature,
                $webhookSecret
            );

            return true;
        } catch (\UnexpectedValueException $e) {
            Log::error('Invalid Stripe webhook payload', [
                'error' => $e->getMessage(),
            ]);
            return false;
        } catch (\Stripe\Exception\SignatureVerificationException $e) {
            Log::error('Invalid Stripe webhook signature', [
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }

    /**
     * Attach a payment method to a customer.
     *
     * @param string $customerId The Stripe customer ID
     * @param string $paymentMethodId The payment method ID
     * @throws Exception If attachment fails
     */
    private function attachPaymentMethod(string $customerId, string $paymentMethodId): void
    {
        try {
            $paymentMethod = \Stripe\PaymentMethod::retrieve($paymentMethodId);
            $paymentMethod->attach(['customer' => $customerId]);

            // Set as default payment method
            \Stripe\Customer::update($customerId, [
                'invoice_settings' => [
                    'default_payment_method' => $paymentMethodId,
                ],
            ]);
        } catch (ApiErrorException $e) {
            Log::error('Failed to attach payment method', [
                'customer_id' => $customerId,
                'payment_method_id' => $paymentMethodId,
                'error' => $e->getMessage(),
            ]);

            throw new Exception('Failed to attach payment method: ' . $e->getMessage(), 0, $e);
        }
    }
}