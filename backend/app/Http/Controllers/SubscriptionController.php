<?php

namespace App\Http\Controllers;

use App\Http\Requests\CheckoutSessionRequest;
use App\Http\Requests\SubscriptionUpdateRequest;
use App\Http\Resources\SubscriptionEventResource;
use App\Http\Resources\SubscriptionResource;
use App\Models\Board;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\SubscriptionEvent;
use App\Models\Tenant;
use App\Models\User;
use App\Models\Workspace;
use App\Services\BillingProviders\BillingProviderFactory;
use App\Services\SubscriptionStateManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

/**
 * Subscription Controller
 * 
 * Handles all subscription-related operations including:
 * - Viewing current subscription
 * - Creating checkout sessions
 * - Upgrading/downgrading plans
 * - Canceling and resuming subscriptions
 * - Accessing customer portal
 * - Viewing subscription history and usage
 */
class SubscriptionController extends Controller
{
    /**
     * The billing provider instance.
     */
    protected $billingProvider;

    /**
     * The subscription state manager.
     */
    protected $stateManager;

    /**
     * Create a new controller instance.
     */
    public function __construct()
    {
        $this->billingProvider = BillingProviderFactory::create();
        $this->stateManager = new SubscriptionStateManager();
    }

    /**
     * Get the current tenant's subscription.
     * 
     * Returns detailed information about the current subscription including
     * plan details, usage statistics, and subscription status.
     * 
     * @response {
     *   "data": {
     *     "id": 1,
     *     "status": "active",
     *     "trial_ends_at": null,
     *     "ends_at": null,
     *     "is_trialing": false,
     *     "is_active": true,
     *     "is_past_due": false,
     *     "is_canceled": false,
     *     "is_expired": false,
     *     "is_within_grace_period": false,
     *     "trial_days_remaining": 0,
     *     "days_remaining": null,
     *     "plan": {
     *       "id": 1,
     *       "name": "Professional",
     *       "slug": "professional",
     *       "price": "29.99",
     *       "formatted_price": "$29.99",
     *       "billing_interval": "month",
     *       "features": ["advanced_analytics", "priority_support"],
     *       "limits": {"max_users": 50, "max_workspaces": 20}
     *     },
     *     "usage": {
     *       "users": 12,
     *       "workspaces": 5,
     *       "boards": 25,
     *       "storage_mb": 1024
     *     },
     *     "limits": {
     *       "max_users": 50,
     *       "max_workspaces": 20,
     *       "max_boards": 100,
     *       "max_storage_mb": 10240
     *     }
     *   }
     * }
     */
    public function index(Request $request): JsonResponse
    {
        $tenant = $request->attributes->get('tenant');
        
        if (!$tenant) {
            return response()->json([
                'message' => 'Tenant not found',
            ], 404);
        }

        // Check authorization - only owners and admins can view subscription
        $user = Auth::user();
        if (!$tenant->canUserManage($user)) {
            return response()->json([
                'message' => 'You do not have permission to view subscription information',
            ], 403);
        }

        $subscription = $tenant->activeSubscription()->with('plan')->first();

        if (!$subscription) {
            return response()->json([
                'message' => 'No active subscription found',
                'data' => null,
            ], 404);
        }

        // Get current usage statistics
        $usage = $this->getCurrentUsage($tenant);

        return (new SubscriptionResource($subscription))->additional([
            'usage' => $usage,
            'limits' => $subscription->getPlanLimits(),
        ]);
    }

    /**
     * Create a checkout session for a new subscription.
     * 
     * Creates a Stripe checkout session for the specified plan.
     * Supports both monthly and yearly billing intervals.
     * 
     * @bodyParam plan_id integer required The ID of the plan to subscribe to. Example: 1
     * @bodyParam billing_interval string required The billing interval (month/year). Example: month
     * @bodyParam success_url string optional URL to redirect to after successful payment. Example: https://app.example.com/billing/success
     * @bodyParam cancel_url string optional URL to redirect to after canceled payment. Example: https://app.example.com/billing/cancel
     * @bodyParam customer_email string optional Customer email for new customers. Example: user@example.com
     * 
     * @response {
     *   "data": {
     *     "session_id": "cs_test_1234567890",
     *     "url": "https://checkout.stripe.com/pay/cs_test_1234567890"
     *   }
     * }
     */
    public function checkout(CheckoutSessionRequest $request): JsonResponse
    {
        $tenant = $request->attributes->get('tenant');
        $user = Auth::user();
        
        if (!$tenant) {
            return response()->json([
                'message' => 'Tenant not found',
            ], 404);
        }

        // Check authorization - only owners can create subscriptions
        if (!$tenant->hasUserRole($user, 'owner')) {
            return response()->json([
                'message' => 'Only tenant owners can create subscriptions',
            ], 403);
        }

        // Check if tenant already has an active subscription
        if ($tenant->hasActiveSubscription()) {
            return response()->json([
                'message' => 'Tenant already has an active subscription',
            ], 422);
        }

        $validated = $request->validated();
        
        // Find the plan
        $plan = Plan::where('id', $validated['plan_id'])
            ->where('billing_interval', $validated['billing_interval'])
            ->first();

        if (!$plan) {
            return response()->json([
                'message' => 'Plan not found',
            ], 404);
        }

        try {
            // Create checkout session
            $sessionData = $this->billingProvider->createCheckoutSession($tenant, $plan, [
                'success_url' => $validated['success_url'] ?? null,
                'cancel_url' => $validated['cancel_url'] ?? null,
                'customer_email' => $validated['customer_email'] ?? null,
            ]);

            Log::info('Checkout session created', [
                'tenant_id' => $tenant->id,
                'plan_id' => $plan->id,
                'session_id' => $sessionData['id'],
                'user_id' => $user->id,
            ]);

            return response()->json([
                'data' => [
                    'session_id' => $sessionData['id'],
                    'url' => $sessionData['url'],
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to create checkout session', [
                'tenant_id' => $tenant->id,
                'plan_id' => $plan->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Failed to create checkout session: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Upgrade or downgrade a subscription.
     * 
     * Changes the subscription to a different plan.
     * Supports proration and immediate or period-end changes.
     * 
     * @bodyParam plan_id integer required The ID of the new plan. Example: 2
     * @bodyParam billing_interval string required The billing interval (month/year). Example: year
     * @bodyParam proration_behavior string optional How to handle proration (create_prorations/none). Example: create_prorations
     * @bodyParam effective_when string optional When the change takes effect (immediately/period_end). Example: immediately
     * 
     * @response {
     *   "data": {
     *     "id": 1,
     *     "status": "active",
     *     "plan": {
     *       "id": 2,
     *       "name": "Enterprise",
     *       "slug": "enterprise",
     *       "price": "99.99",
     *       "formatted_price": "$99.99",
     *       "billing_interval": "year"
     *     }
     *   }
     * }
     */
    public function upgrade(SubscriptionUpdateRequest $request): JsonResponse
    {
        $tenant = $request->attributes->get('tenant');
        $user = Auth::user();
        
        if (!$tenant) {
            return response()->json([
                'message' => 'Tenant not found',
            ], 404);
        }

        // Check authorization - only owners can update subscriptions
        if (!$tenant->hasUserRole($user, 'owner')) {
            return response()->json([
                'message' => 'Only tenant owners can update subscriptions',
            ], 403);
        }

        $subscription = $tenant->activeSubscription()->first();
        
        if (!$subscription) {
            return response()->json([
                'message' => 'No active subscription found',
            ], 404);
        }

        $validated = $request->validated();
        
        // Find the new plan
        $newPlan = Plan::where('id', $validated['plan_id'])
            ->where('billing_interval', $validated['billing_interval'])
            ->first();

        if (!$newPlan) {
            return response()->json([
                'message' => 'Plan not found',
            ], 404);
        }

        // Check if it's the same plan
        if ($subscription->plan_id === $newPlan->id) {
            return response()->json([
                'message' => 'Subscription is already on this plan',
            ], 422);
        }

        try {
            $oldPlanId = $subscription->plan_id;
            
            // Update subscription in Stripe
            $stripeSubscription = $this->billingProvider->updateSubscription(
                $subscription,
                $newPlan,
                [
                    'proration_behavior' => $validated['proration_behavior'] ?? 'create_prorations',
                ]
            );

            // Update local subscription
            $subscription->update([
                'plan_id' => $newPlan->id,
                'status' => $stripeSubscription['status'],
            ]);

            // Create plan changed event
            SubscriptionEvent::planChanged($subscription, $oldPlanId, $newPlan->id);

            // Reload with plan relationship
            $subscription->load('plan');

            Log::info('Subscription updated', [
                'tenant_id' => $tenant->id,
                'subscription_id' => $subscription->id,
                'old_plan_id' => $oldPlanId,
                'new_plan_id' => $newPlan->id,
                'user_id' => $user->id,
            ]);

            return new SubscriptionResource($subscription);
        } catch (\Exception $e) {
            Log::error('Failed to update subscription', [
                'tenant_id' => $tenant->id,
                'subscription_id' => $subscription->id,
                'new_plan_id' => $newPlan->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Failed to update subscription: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Cancel a subscription.
     * 
     * Cancels the active subscription either immediately or at the period end.
     * 
     * @bodyParam immediately boolean optional Whether to cancel immediately. Default: false. Example: false
     * @bodyParam reason string optional Reason for cancellation. Example: "Switching to another provider"
     * @bodyParam feedback string optional Additional feedback. Example: "Found a better solution for our needs"
     * 
     * @response {
     *   "data": {
     *     "id": 1,
     *     "status": "canceled",
     *     "ends_at": "2024-02-15T00:00:00.000000Z",
     *     "canceled_at": "2024-01-15T10:30:00.000000Z"
     *   }
     * }
     */
    public function cancel(Request $request): JsonResponse
    {
        $tenant = $request->attributes->get('tenant');
        $user = Auth::user();
        
        if (!$tenant) {
            return response()->json([
                'message' => 'Tenant not found',
            ], 404);
        }

        // Check authorization - only owners can cancel subscriptions
        if (!$tenant->hasUserRole($user, 'owner')) {
            return response()->json([
                'message' => 'Only tenant owners can cancel subscriptions',
            ], 403);
        }

        $subscription = $tenant->activeSubscription()->first();
        
        if (!$subscription) {
            return response()->json([
                'message' => 'No active subscription found',
            ], 404);
        }

        if ($subscription->isCanceled()) {
            return response()->json([
                'message' => 'Subscription is already canceled',
            ], 422);
        }

        $validated = $request->validate([
            'immediately' => 'sometimes|boolean',
            'reason' => 'sometimes|string|max:255',
            'feedback' => 'sometimes|string|max:1000',
        ]);

        $immediately = $validated['immediately'] ?? false;

        try {
            // Cancel subscription in Stripe
            $this->billingProvider->cancelSubscription($subscription, $immediately);

            // Update local subscription using state manager
            $this->stateManager->cancelSubscription($subscription, $immediately);

            // Store cancellation feedback if provided
            if (isset($validated['reason']) || isset($validated['feedback'])) {
                SubscriptionEvent::createEvent($subscription, SubscriptionEvent::TYPE_CANCELED, [
                    'reason' => $validated['reason'] ?? null,
                    'feedback' => $validated['feedback'] ?? null,
                    'canceled_by' => $user->id,
                ]);
            }

            Log::info('Subscription canceled', [
                'tenant_id' => $tenant->id,
                'subscription_id' => $subscription->id,
                'immediately' => $immediately,
                'reason' => $validated['reason'] ?? null,
                'user_id' => $user->id,
            ]);

            return new SubscriptionResource($subscription->fresh());
        } catch (\Exception $e) {
            Log::error('Failed to cancel subscription', [
                'tenant_id' => $tenant->id,
                'subscription_id' => $subscription->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Failed to cancel subscription: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Resume a canceled subscription.
     * 
     * Resumes a subscription that was canceled but not yet expired.
     * 
     * @response {
     *   "data": {
     *     "id": 1,
     *     "status": "active",
     *     "ends_at": null,
     *     "resumed_at": "2024-01-16T09:15:00.000000Z"
     *   }
     * }
     */
    public function resume(Request $request): JsonResponse
    {
        $tenant = $request->attributes->get('tenant');
        $user = Auth::user();
        
        if (!$tenant) {
            return response()->json([
                'message' => 'Tenant not found',
            ], 404);
        }

        // Check authorization - only owners can resume subscriptions
        if (!$tenant->hasUserRole($user, 'owner')) {
            return response()->json([
                'message' => 'Only tenant owners can resume subscriptions',
            ], 403);
        }

        $subscription = $tenant->subscriptions()
            ->where('status', Subscription::STATUS_CANCELED)
            ->where(function ($query) {
                $query->whereNull('ends_at')
                    ->orWhere('ends_at', '>', now());
            })
            ->first();
        
        if (!$subscription) {
            return response()->json([
                'message' => 'No resumable subscription found',
            ], 404);
        }

        try {
            // Resume subscription in Stripe
            $this->billingProvider->resumeSubscription($subscription);

            // Update local subscription using state manager
            $this->stateManager->activateSubscription($subscription);

            // Create resume event
            SubscriptionEvent::createEvent($subscription, SubscriptionEvent::TYPE_UPDATED, [
                'previous_status' => Subscription::STATUS_CANCELED,
                'resumed_by' => $user->id,
            ]);

            Log::info('Subscription resumed', [
                'tenant_id' => $tenant->id,
                'subscription_id' => $subscription->id,
                'user_id' => $user->id,
            ]);

            return new SubscriptionResource($subscription->fresh());
        } catch (\Exception $e) {
            Log::error('Failed to resume subscription', [
                'tenant_id' => $tenant->id,
                'subscription_id' => $subscription->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Failed to resume subscription: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Create a customer portal session.
     * 
     * Creates a Stripe customer portal session for managing billing.
     * 
     * @response {
     *   "data": {
     *     "url": "https://billing.stripe.com/session/1234567890"
     *   }
     * }
     */
    public function portal(Request $request): JsonResponse
    {
        $tenant = $request->attributes->get('tenant');
        $user = Auth::user();
        
        if (!$tenant) {
            return response()->json([
                'message' => 'Tenant not found',
            ], 404);
        }

        // Check authorization - only owners can access billing portal
        if (!$tenant->hasUserRole($user, 'owner')) {
            return response()->json([
                'message' => 'Only tenant owners can access billing portal',
            ], 403);
        }

        // Ensure tenant has a Stripe customer ID
        if (!$tenant->stripe_customer_id) {
            return response()->json([
                'message' => 'No billing account found',
            ], 404);
        }

        try {
            $portalSession = $this->billingProvider->createPortalSession(
                $tenant->stripe_customer_id,
                [
                    'return_url' => $request->input('return_url', config('app.url') . '/billing'),
                ]
            );

            Log::info('Portal session created', [
                'tenant_id' => $tenant->id,
                'session_id' => $portalSession['id'],
                'user_id' => $user->id,
            ]);

            return response()->json([
                'data' => [
                    'url' => $portalSession['url'],
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to create portal session', [
                'tenant_id' => $tenant->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Failed to create portal session: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get subscription history and events.
     * 
     * Returns a list of all subscription events and state changes.
     * 
     * @queryParam limit integer Number of events to return. Default: 50. Example: 20
     * @queryParam offset integer Number of events to skip. Default: 0. Example: 0
     * @queryParam type string Filter by event type. Example: payment_succeeded
     * 
     * @response {
     *   "data": [
     *     {
     *       "id": 1,
     *       "type": "created",
     *       "type_display": "Created",
     *       "data": {},
     *       "processed_at": null,
     *       "created_at": "2024-01-01T00:00:00.000000Z"
     *     }
     *   ],
     *   "meta": {
     *     "total": 25,
     *     "limit": 50,
     *     "offset": 0
     *   }
     * }
     */
    public function history(Request $request): JsonResponse
    {
        $tenant = $request->attributes->get('tenant');
        $user = Auth::user();
        
        if (!$tenant) {
            return response()->json([
                'message' => 'Tenant not found',
            ], 404);
        }

        // Check authorization - only owners and admins can view history
        if (!$tenant->canUserManage($user)) {
            return response()->json([
                'message' => 'You do not have permission to view subscription history',
            ], 403);
        }

        $validated = $request->validate([
            'limit' => 'sometimes|integer|min:1|max:100',
            'offset' => 'sometimes|integer|min:0',
            'type' => 'sometimes|string|in:' . implode(',', [
                SubscriptionEvent::TYPE_CREATED,
                SubscriptionEvent::TYPE_UPDATED,
                SubscriptionEvent::TYPE_CANCELED,
                SubscriptionEvent::TYPE_EXPIRED,
                SubscriptionEvent::TYPE_PAYMENT_FAILED,
                SubscriptionEvent::TYPE_PAYMENT_SUCCEEDED,
                SubscriptionEvent::TYPE_TRIAL_STARTED,
                SubscriptionEvent::TYPE_TRIAL_ENDED,
                SubscriptionEvent::TYPE_PLAN_CHANGED,
                SubscriptionEvent::TYPE_RENEWED,
            ]),
        ]);

        $limit = $validated['limit'] ?? 50;
        $offset = $validated['offset'] ?? 0;

        $query = $tenant->subscriptions()
            ->with('subscriptionEvents')
            ->get()
            ->pluck('subscriptionEvents')
            ->flatten()
            ->sortByDesc('created_at');

        // Filter by type if specified
        if (isset($validated['type'])) {
            $query = $query->where('type', $validated['type']);
        }

        $total = $query->count();
        $events = $query->slice($offset, $limit)->values();

        return response()->json([
            'data' => SubscriptionEventResource::collection($events),
            'meta' => [
                'total' => $total,
                'limit' => $limit,
                'offset' => $offset,
            ],
        ]);
    }

    /**
     * Get current usage statistics.
     * 
     * Returns detailed usage statistics for the current billing period.
     * 
     * @response {
     *   "data": {
     *     "users": {
     *       "current": 12,
     *       "limit": 50,
     *       "percentage": 24,
     *       "remaining": 38
     *     },
     *     "workspaces": {
     *       "current": 5,
     *       "limit": 20,
     *       "percentage": 25,
     *       "remaining": 15
     *     },
     *     "boards": {
     *       "current": 25,
     *       "limit": 100,
     *       "percentage": 25,
     *       "remaining": 75
     *     },
     *     "storage_mb": {
     *       "current": 1024,
     *       "limit": 10240,
     *       "percentage": 10,
     *       "remaining": 9216
     *     }
     *   }
     * }
     */
    public function usage(Request $request): JsonResponse
    {
        $tenant = $request->attributes->get('tenant');
        $user = Auth::user();
        
        if (!$tenant) {
            return response()->json([
                'message' => 'Tenant not found',
            ], 404);
        }

        // Check authorization - only owners and admins can view usage
        if (!$tenant->canUserManage($user)) {
            return response()->json([
                'message' => 'You do not have permission to view usage statistics',
            ], 403);
        }

        $subscription = $tenant->activeSubscription()->with('plan')->first();
        
        if (!$subscription) {
            return response()->json([
                'message' => 'No active subscription found',
            ], 404);
        }

        $usage = $this->getCurrentUsage($tenant);
        $limits = $subscription->getPlanLimits();
        $usageStats = [];

        foreach ($usage as $key => $current) {
            $limit = $limits[$key] ?? 0;
            $remaining = max(0, $limit - $current);
            $percentage = $limit > 0 ? round(($current / $limit) * 100, 2) : 0;

            $usageStats[$key] = [
                'current' => $current,
                'limit' => $limit,
                'percentage' => $percentage,
                'remaining' => $remaining,
            ];
        }

        return response()->json([
            'data' => $usageStats,
        ]);
    }

    /**
     * Get current usage statistics for a tenant.
     */
    private function getCurrentUsage(Tenant $tenant): array
    {
        return [
            'users' => $tenant->users()->count(),
            'workspaces' => $tenant->workspaces()->count(),
            'boards' => $tenant->boards()->count(),
            // Note: storage calculation would depend on your file storage implementation
            'storage_mb' => 1024, // Placeholder - implement actual storage calculation
        ];
    }
}