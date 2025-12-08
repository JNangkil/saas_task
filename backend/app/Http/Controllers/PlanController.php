<?php

namespace App\Http\Controllers;

use App\Http\Resources\PlanComparisonResource;
use App\Http\Resources\PlanResource;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\Tenant;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Validator;

class PlanController extends Controller
{
    /**
     * Cache duration in seconds for public endpoints.
     */
    const CACHE_DURATION = 3600; // 1 hour

    /**
     * Display a listing of all available plans.
     * 
     * This endpoint is public and accessible without authentication.
     * It's intended for pricing pages and marketing materials.
     * 
     * @queryParam interval string Filter by billing interval (month, year). Example: month
     * @queryParam featured boolean Filter to only show featured plans. Example: true
     * @queryParam has_feature string Filter plans that have a specific feature. Example: sso
     * 
     * @response {
     *   "data": [
     *     {
     *       "id": 1,
     *       "name": "Starter",
     *       "slug": "starter",
     *       "price": "9.99",
     *       "formatted_price": "$9.99",
     *       "billing_interval": "month",
     *       "billing_interval_display": "Monthly",
     *       "trial_days": 14,
     *       "features": ["basic_analytics", "email_support"],
     *       "limits": {"max_users": 5, "max_workspaces": 2},
     *       "is_popular": false,
     *       "metadata": {}
     *     }
     *   ]
     * }
     */
    public function index(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'interval' => 'sometimes|in:month,year',
            'featured' => 'sometimes|boolean',
            'has_feature' => 'sometimes|string|max:50',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Invalid query parameters',
                'errors' => $validator->errors(),
            ], 422);
        }

        $cacheKey = 'plans:' . md5(json_encode($request->only(['interval', 'featured', 'has_feature'])));

        $plans = Cache::remember($cacheKey, self::CACHE_DURATION, function () use ($request) {
            $query = Plan::query();

            // Filter by billing interval
            if ($request->has('interval')) {
                $query->where('billing_interval', $request->input('interval'));
            }

            // Filter by featured status
            if ($request->has('featured')) {
                $query->where('is_popular', $request->boolean('featured'));
            }

            // Filter by feature
            if ($request->has('has_feature')) {
                $query->whereJsonContains('features', $request->input('has_feature'));
            }

            return $query->orderBy('price', 'asc')->get();
        });

        return PlanResource::collection($plans);
    }

    /**
     * Display the specified plan by slug.
     * 
     * This endpoint is public and accessible without authentication.
     * 
     * @urlParam slug string required The slug of the plan. Example: starter
     * 
     * @response {
     *   "data": {
     *     "id": 1,
     *     "name": "Starter",
     *     "slug": "starter",
     *     "price": "9.99",
     *     "formatted_price": "$9.99",
     *     "billing_interval": "month",
     *     "billing_interval_display": "Monthly",
     *     "trial_days": 14,
     *     "features": ["basic_analytics", "email_support"],
     *     "limits": {"max_users": 5, "max_workspaces": 2},
     *     "is_popular": false,
     *     "metadata": {},
     *     "description": "Perfect for small teams getting started",
     *     "promotional_message": "Start with 14-day free trial"
     *   }
     * }
     */
    public function show(string $slug): JsonResponse
    {
        $cacheKey = "plan:{$slug}";

        $plan = Cache::remember($cacheKey, self::CACHE_DURATION, function () use ($slug) {
            return Plan::where('slug', $slug)->first();
        });

        if (!$plan) {
            return response()->json([
                'message' => 'Plan not found',
            ], 404);
        }

        return new PlanResource($plan);
    }

    /**
     * Compare multiple plans side by side.
     * 
     * This endpoint is public and accessible without authentication.
     * It's useful for pricing comparison pages.
     * 
     * @queryParam slugs string required Comma-separated list of plan slugs to compare. Example: starter,professional,enterprise
     * @queryParam features string optional Comma-separated list of specific features to highlight. Example: sso,api_access,custom_domains
     * 
     * @response {
     *   "data": {
     *     "plans": [
     *       {
     *         "id": 1,
     *         "name": "Starter",
     *         "slug": "starter",
     *         "price": "9.99",
     *         "formatted_price": "$9.99",
     *         "billing_interval": "month",
     *         "features": ["basic_analytics", "email_support"],
     *         "limits": {"max_users": 5, "max_workspaces": 2}
     *       }
     *     ],
     *     "comparison_matrix": {
     *       "basic_analytics": [true, true, true],
     *       "sso": [false, true, true]
     *     },
     *     "all_features": ["basic_analytics", "sso", "api_access"]
     *   }
     * }
     */
    public function compare(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'slugs' => 'required|string',
            'features' => 'sometimes|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Invalid query parameters',
                'errors' => $validator->errors(),
            ], 422);
        }

        $slugs = explode(',', $request->input('slugs'));
        $features = $request->has('features') ? explode(',', $request->input('features')) : null;

        if (count($slugs) < 2) {
            return response()->json([
                'message' => 'At least 2 plans are required for comparison',
            ], 422);
        }

        if (count($slugs) > 5) {
            return response()->json([
                'message' => 'Cannot compare more than 5 plans at once',
            ], 422);
        }

        $cacheKey = 'plans:compare:' . md5(json_encode($request->only(['slugs', 'features'])));

        $comparison = Cache::remember($cacheKey, self::CACHE_DURATION, function () use ($slugs, $features) {
            $plans = Plan::whereIn('slug', $slugs)->orderBy('price', 'asc')->get();

            if ($plans->count() !== count($slugs)) {
                return null;
            }

            return new PlanComparisonResource($plans, $features);
        });

        if (!$comparison) {
            return response()->json([
                'message' => 'One or more plans not found',
            ], 404);
        }

        return $comparison;
    }

    /**
     * Get the current tenant's active subscription and plan.
     * 
     * This endpoint requires authentication and returns the current tenant's
     * subscription details including plan information, usage, and limits.
     * 
     * @response {
     *   "data": {
     *     "subscription": {
     *       "id": 1,
     *       "status": "active",
     *       "trial_ends_at": "2024-02-15T00:00:00.000000Z",
     *       "ends_at": null,
     *       "is_trialing": false,
     *       "is_active": true,
     *       "trial_days_remaining": 0,
     *       "days_remaining": null
     *     },
     *     "plan": {
     *       "id": 1,
     *       "name": "Professional",
     *       "slug": "professional",
     *       "price": "29.99",
     *       "formatted_price": "$29.99",
     *       "billing_interval": "month",
     *       "features": ["advanced_analytics", "priority_support", "api_access"],
     *       "limits": {"max_users": 50, "max_workspaces": 20}
     *     },
     *     "usage": {
     *       "users": 12,
     *       "workspaces": 5,
     *       "boards": 25
     *     }
     *   }
     * }
     */
    public function current(Request $request): JsonResponse
    {
        $user = Auth::user();
        $tenant = $request->attributes->get('tenant');

        if (!$tenant) {
            return response()->json([
                'message' => 'Tenant not found',
            ], 404);
        }

        $subscription = $tenant->subscriptions()
            ->with('plan')
            ->valid()
            ->first();

        if (!$subscription) {
            return response()->json([
                'message' => 'No active subscription found',
                'data' => [
                    'subscription' => null,
                    'plan' => null,
                    'usage' => null,
                ],
            ]);
        }

        // Get current usage
        $usage = [
            'users' => $tenant->users()->count(),
            'workspaces' => $tenant->workspaces()->count(),
            'boards' => $tenant->boards()->count(),
        ];

        return response()->json([
            'data' => [
                'subscription' => [
                    'id' => $subscription->id,
                    'status' => $subscription->status,
                    'status_display' => $subscription->status_display,
                    'trial_ends_at' => $subscription->trial_ends_at,
                    'ends_at' => $subscription->ends_at,
                    'is_trialing' => $subscription->isTrialing(),
                    'is_active' => $subscription->isActive(),
                    'is_past_due' => $subscription->isPastDue(),
                    'is_canceled' => $subscription->isCanceled(),
                    'is_expired' => $subscription->isExpired(),
                    'is_within_grace_period' => $subscription->isWithinGracePeriod(),
                    'trial_days_remaining' => $subscription->getTrialDaysRemaining(),
                    'days_remaining' => $subscription->getDaysRemaining(),
                    'created_at' => $subscription->created_at,
                    'updated_at' => $subscription->updated_at,
                ],
                'plan' => new PlanResource($subscription->plan),
                'usage' => $usage,
            ],
        ]);
    }

    /**
     * List all available features across all plans.
     * 
     * This endpoint is public and accessible without authentication.
     * It returns a comprehensive list of all features available across plans,
     * useful for feature comparison tables.
     * 
     * @queryParam category string Filter features by category. Example: analytics
     * 
     * @response {
     *   "data": {
     *     "features": [
     *       {
     *         "name": "basic_analytics",
     *         "display_name": "Basic Analytics",
     *         "description": "View basic usage statistics and reports",
     *         "category": "analytics",
     *         "available_in_plans": ["starter", "professional", "enterprise"],
     *         "popular_in_plans": ["professional", "enterprise"]
     *       }
     *     ],
     *     "categories": ["analytics", "support", "security", "integration"]
     *   }
     * }
     */
    public function features(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'category' => 'sometimes|string|max:50',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Invalid query parameters',
                'errors' => $validator->errors(),
            ], 422);
        }

        $cacheKey = 'plans:features:' . ($request->input('category', 'all'));

        $features = Cache::remember($cacheKey, self::CACHE_DURATION, function () use ($request) {
            $plans = Plan::all();
            $allFeatures = [];
            $categories = [];

            foreach ($plans as $plan) {
                foreach ($plan->features ?? [] as $feature) {
                    if (!isset($allFeatures[$feature])) {
                        $allFeatures[$feature] = [
                            'name' => $feature,
                            'display_name' => ucwords(str_replace('_', ' ', $feature)),
                            'description' => $this->getFeatureDescription($feature),
                            'category' => $this->getFeatureCategory($feature),
                            'available_in_plans' => [],
                            'popular_in_plans' => [],
                        ];
                    }

                    $allFeatures[$feature]['available_in_plans'][] = $plan->slug;
                    
                    if ($plan->is_popular) {
                        $allFeatures[$feature]['popular_in_plans'][] = $plan->slug;
                    }

                    $category = $this->getFeatureCategory($feature);
                    if (!in_array($category, $categories)) {
                        $categories[] = $category;
                    }
                }
            }

            // Filter by category if requested
            if ($request->has('category')) {
                $allFeatures = array_filter($allFeatures, function ($feature) use ($request) {
                    return $feature['category'] === $request->input('category');
                });
            }

            return [
                'features' => array_values($allFeatures),
                'categories' => $categories,
            ];
        });

        return response()->json(['data' => $features]);
    }

    /**
     * Get a human-readable description for a feature.
     */
    private function getFeatureDescription(string $feature): string
    {
        $descriptions = [
            'basic_analytics' => 'View basic usage statistics and reports',
            'advanced_analytics' => 'Detailed analytics with custom reports and insights',
            'email_support' => 'Get help via email during business hours',
            'priority_support' => 'Priority email support with faster response times',
            '24_7_support' => 'Round-the-clock support via phone and email',
            'sso' => 'Single Sign-On integration with SAML 2.0',
            'api_access' => 'RESTful API for custom integrations',
            'webhooks' => 'Webhook notifications for events',
            'custom_domains' => 'Use your own domain for workspaces',
            'team_collaboration' => 'Advanced collaboration tools for teams',
            'audit_logs' => 'Detailed audit logs for compliance',
            'custom_branding' => 'Customize branding and appearance',
            'advanced_permissions' => 'Granular permission controls',
            'data_export' => 'Export your data in various formats',
            'backup_and_restore' => 'Automated backups and restore options',
        ];

        return $descriptions[$feature] ?? 'Advanced feature for enhanced functionality';
    }

    /**
     * Get the category for a feature.
     */
    private function getFeatureCategory(string $feature): string
    {
        $categories = [
            'basic_analytics' => 'analytics',
            'advanced_analytics' => 'analytics',
            'email_support' => 'support',
            'priority_support' => 'support',
            '24_7_support' => 'support',
            'sso' => 'security',
            'audit_logs' => 'security',
            'api_access' => 'integration',
            'webhooks' => 'integration',
            'custom_domains' => 'customization',
            'custom_branding' => 'customization',
            'team_collaboration' => 'collaboration',
            'advanced_permissions' => 'collaboration',
            'data_export' => 'data_management',
            'backup_and_restore' => 'data_management',
        ];

        return $categories[$feature] ?? 'general';
    }
}