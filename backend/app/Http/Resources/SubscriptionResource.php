<?php

namespace App\Http\Resources;

use App\Http\Resources\PlanResource;
use App\Models\Subscription;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Subscription Resource
 * 
 * Transforms subscription data for API responses, providing a consistent
 * format for subscription information across all endpoints.
 */
class SubscriptionResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var Subscription $subscription */
        $subscription = $this->resource;
        
        $data = [
            'id' => $subscription->id,
            'status' => $subscription->status,
            'status_display' => $subscription->status_display,
            'trial_ends_at' => $subscription->trial_ends_at,
            'ends_at' => $subscription->ends_at,
            'created_at' => $subscription->created_at,
            'updated_at' => $subscription->updated_at,
            
            // Status flags for easy checking
            'is_trialing' => $subscription->isTrialing(),
            'is_active' => $subscription->isActive(),
            'is_past_due' => $subscription->isPastDue(),
            'is_canceled' => $subscription->isCanceled(),
            'is_expired' => $subscription->isExpired(),
            'is_within_grace_period' => $subscription->isWithinGracePeriod(),
            'is_valid' => $subscription->isValid(),
            
            // Time calculations
            'trial_days_remaining' => $subscription->getTrialDaysRemaining(),
            'days_remaining' => $subscription->getDaysRemaining(),
            
            // Stripe identifiers
            'stripe_subscription_id' => $subscription->stripe_subscription_id,
            'stripe_customer_id' => $subscription->stripe_customer_id,
        ];
        
        // Include plan information if loaded
        if ($subscription->relationLoaded('plan') && $subscription->plan) {
            $data['plan'] = new PlanResource($subscription->plan);
        }
        
        // Include tenant information if loaded
        if ($subscription->relationLoaded('tenant') && $subscription->tenant) {
            $data['tenant'] = [
                'id' => $subscription->tenant->id,
                'name' => $subscription->tenant->name,
                'slug' => $subscription->tenant->slug,
            ];
        }
        
        // Add subscription period information if available from Stripe
        if (isset($subscription->metadata['current_period_start'])) {
            $data['current_period'] = [
                'start' => $subscription->metadata['current_period_start'],
                'end' => $subscription->metadata['current_period_end'] ?? null,
            ];
        }
        
        // Add cancellation information if applicable
        if ($subscription->isCanceled()) {
            $data['cancellation'] = [
                'canceled_at' => $subscription->updated_at,
                'effective_date' => $subscription->ends_at,
                'immediate' => $subscription->ends_at && $subscription->ends_at->lt(now()->addDay()),
            ];
        }
        
        // Add trial information if applicable
        if ($subscription->isTrialing()) {
            $data['trial'] = [
                'started_at' => $subscription->created_at,
                'ends_at' => $subscription->trial_ends_at,
                'days_remaining' => $subscription->getTrialDaysRemaining(),
                'will_convert_to' => $subscription->plan ? [
                    'name' => $subscription->plan->name,
                    'price' => $subscription->plan->formatted_price,
                    'interval' => $subscription->plan->billing_interval_display,
                ] : null,
            ];
        }
        
        // Add payment information if available
        if (isset($subscription->metadata['default_payment_method'])) {
            $data['payment_method'] = [
                'type' => $subscription->metadata['payment_method_type'] ?? 'card',
                'last4' => $subscription->metadata['payment_method_last4'] ?? null,
                'brand' => $subscription->metadata['payment_method_brand'] ?? null,
                'expires_at' => $subscription->metadata['payment_method_expires'] ?? null,
            ];
        }
        
        // Add upcoming invoice information if available
        if (isset($subscription->metadata['upcoming_invoice'])) {
            $data['upcoming_invoice'] = [
                'amount' => $subscription->metadata['upcoming_invoice_amount'] ?? 0,
                'formatted_amount' => '$' . number_format($subscription->metadata['upcoming_invoice_amount'] ?? 0, 2),
                'date' => $subscription->metadata['upcoming_invoice_date'] ?? null,
                'currency' => $subscription->metadata['upcoming_invoice_currency'] ?? 'USD',
            ];
        }
        
        // Add renewal information for active subscriptions
        if ($subscription->isActive() && $subscription->ends_at) {
            $data['renewal'] = [
                'scheduled_at' => $subscription->ends_at,
                'days_until_renewal' => $subscription->getDaysRemaining(),
                'will_renew_automatically' => !$subscription->isCanceled(),
            ];
        }
        
        // Add plan limits for easy reference
        if ($subscription->plan) {
            $data['limits'] = $subscription->getPlanLimits();
        }
        
        // Add metadata if it exists
        if (!empty($subscription->metadata)) {
            $data['metadata'] = $subscription->metadata;
        }
        
        return $data;
    }
}