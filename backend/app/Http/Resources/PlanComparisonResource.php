<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Collection;

class PlanComparisonResource extends JsonResource
{
    /**
     * The additional features to highlight in the comparison.
     */
    protected array $highlightFeatures;

    /**
     * Create a new resource instance.
     *
     * @param \Illuminate\Support\Collection $plans
     * @param array|null $highlightFeatures
     * @return void
     */
    public function __construct(Collection $plans, ?array $highlightFeatures = null)
    {
        parent::__construct($plans);
        $this->highlightFeatures = $highlightFeatures ?? [];
    }

    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $plans = $this->resource;
        
        // Get all unique features across all plans
        $allFeatures = $this->getAllFeatures($plans);
        
        // If specific features are requested, prioritize them
        if (!empty($this->highlightFeatures)) {
            $highlightedFeatures = array_intersect($allFeatures, $this->highlightFeatures);
            $otherFeatures = array_diff($allFeatures, $this->highlightFeatures);
            $orderedFeatures = array_merge($highlightedFeatures, $otherFeatures);
        } else {
            $orderedFeatures = $allFeatures;
        }

        // Build comparison matrix
        $comparisonMatrix = $this->buildComparisonMatrix($plans, $orderedFeatures);
        
        // Get all unique limits across all plans
        $allLimits = $this->getAllLimits($plans);
        $limitsMatrix = $this->buildLimitsMatrix($plans, $allLimits);

        return [
            'plans' => PlanResource::collection($plans),
            'comparison_matrix' => [
                'features' => $comparisonMatrix,
                'limits' => $limitsMatrix,
            ],
            'all_features' => $orderedFeatures,
            'all_limits' => $allLimits,
            'feature_categories' => $this->categorizeFeatures($orderedFeatures),
            'recommended_plan' => $this->getRecommendedPlan($plans),
        ];
    }

    /**
     * Get all unique features across all plans.
     */
    private function getAllFeatures(Collection $plans): array
    {
        $features = [];
        
        foreach ($plans as $plan) {
            foreach ($plan->features ?? [] as $feature) {
                if (!in_array($feature, $features)) {
                    $features[] = $feature;
                }
            }
        }
        
        // Sort features alphabetically for consistent ordering
        sort($features);
        
        return $features;
    }

    /**
     * Get all unique limits across all plans.
     */
    private function getAllLimits(Collection $plans): array
    {
        $limits = [];
        
        foreach ($plans as $plan) {
            foreach ($plan->limits ?? [] as $limit => $value) {
                if (!in_array($limit, $limits)) {
                    $limits[] = $limit;
                }
            }
        }
        
        // Sort limits alphabetically for consistent ordering
        sort($limits);
        
        return $limits;
    }

    /**
     * Build a comparison matrix for features.
     */
    private function buildComparisonMatrix(Collection $plans, array $features): array
    {
        $matrix = [];
        
        foreach ($features as $feature) {
            $featureData = [
                'name' => $feature,
                'display_name' => $this->getFeatureDisplayName($feature),
                'description' => $this->getFeatureDescription($feature),
                'category' => $this->getFeatureCategory($feature),
                'plans' => [],
            ];
            
            foreach ($plans as $plan) {
                $hasFeature = in_array($feature, $plan->features ?? []);
                $isHighlighted = $plan->is_popular && $hasFeature;
                
                $featureData['plans'][] = [
                    'plan_id' => $plan->id,
                    'plan_slug' => $plan->slug,
                    'has_feature' => $hasFeature,
                    'is_highlighted' => $isHighlighted,
                ];
            }
            
            $matrix[] = $featureData;
        }
        
        return $matrix;
    }

    /**
     * Build a comparison matrix for limits.
     */
    private function buildLimitsMatrix(Collection $plans, array $limits): array
    {
        $matrix = [];
        
        foreach ($limits as $limit) {
            $limitData = [
                'name' => $limit,
                'display_name' => $this->getLimitDisplayName($limit),
                'unit' => $this->getLimitUnit($limit),
                'plans' => [],
            ];
            
            foreach ($plans as $plan) {
                $value = $plan->limits[$limit] ?? 0;
                $isUnlimited = $value === -1;
                $isHighlighted = $plan->is_popular;
                
                $limitData['plans'][] = [
                    'plan_id' => $plan->id,
                    'plan_slug' => $plan->slug,
                    'value' => $value,
                    'is_unlimited' => $isUnlimited,
                    'display_value' => $isUnlimited ? 'Unlimited' : $this->formatLimitValue($value, $limit),
                    'is_highlighted' => $isHighlighted,
                ];
            }
            
            $matrix[] = $limitData;
        }
        
        return $matrix;
    }

    /**
     * Categorize features for better organization.
     */
    private function categorizeFeatures(array $features): array
    {
        $categories = [];
        
        foreach ($features as $feature) {
            $category = $this->getFeatureCategory($feature);
            
            if (!isset($categories[$category])) {
                $categories[$category] = [
                    'name' => $category,
                    'display_name' => $this->getCategoryDisplayName($category),
                    'features' => [],
                ];
            }
            
            $categories[$category]['features'][] = $feature;
        }
        
        return array_values($categories);
    }

    /**
     * Get the recommended plan based on popularity and features.
     */
    private function getRecommendedPlan(Collection $plans): ?array
    {
        // First, try to find a plan marked as popular
        $popularPlan = $plans->firstWhere('is_popular', true);
        
        if ($popularPlan) {
            return [
                'plan_id' => $popularPlan->id,
                'plan_slug' => $popularPlan->slug,
                'reason' => 'Most popular choice',
            ];
        }
        
        // If no popular plan, recommend the middle-priced plan
        $sortedPlans = $plans->sortBy('price');
        $middleIndex = floor($sortedPlans->count() / 2);
        $recommendedPlan = $sortedPlans->values()->get($middleIndex);
        
        if ($recommendedPlan) {
            return [
                'plan_id' => $recommendedPlan->id,
                'plan_slug' => $recommendedPlan->slug,
                'reason' => 'Best value for money',
            ];
        }
        
        return null;
    }

    /**
     * Get a display-friendly name for a feature.
     */
    private function getFeatureDisplayName(string $feature): string
    {
        return ucwords(str_replace('_', ' ', $feature));
    }

    /**
     * Get a description for a feature.
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

    /**
     * Get a display-friendly name for a category.
     */
    private function getCategoryDisplayName(string $category): string
    {
        $displayNames = [
            'analytics' => 'Analytics & Reporting',
            'support' => 'Support & Service',
            'security' => 'Security & Compliance',
            'integration' => 'Integrations & API',
            'customization' => 'Customization & Branding',
            'collaboration' => 'Collaboration & Teamwork',
            'data_management' => 'Data Management',
            'general' => 'General Features',
        ];

        return $displayNames[$category] ?? ucwords($category);
    }

    /**
     * Get a display-friendly name for a limit.
     */
    private function getLimitDisplayName(string $limit): string
    {
        $names = [
            'max_users' => 'Users',
            'max_workspaces' => 'Workspaces',
            'max_boards' => 'Boards',
            'max_storage_mb' => 'Storage',
            'max_api_calls_per_month' => 'API Calls per Month',
            'max_projects' => 'Projects',
            'max_team_members' => 'Team Members',
        ];

        return $names[$limit] ?? ucwords(str_replace('_', ' ', $limit));
    }

    /**
     * Get the unit for a limit.
     */
    private function getLimitUnit(string $limit): string
    {
        $units = [
            'max_users' => 'users',
            'max_workspaces' => 'workspaces',
            'max_boards' => 'boards',
            'max_storage_mb' => 'MB',
            'max_api_calls_per_month' => 'calls',
            'max_projects' => 'projects',
            'max_team_members' => 'members',
        ];

        return $units[$limit] ?? '';
    }

    /**
     * Format a limit value for display.
     */
    private function formatLimitValue(int $value, string $limit): string
    {
        // Special formatting for storage
        if ($limit === 'max_storage_mb' && $value >= 1024) {
            $gb = round($value / 1024, 1);
            return "{$gb}GB";
        }

        // Special formatting for API calls
        if ($limit === 'max_api_calls_per_month' && $value >= 1000000) {
            $millions = round($value / 1000000, 1);
            return "{$millions}M";
        }

        return (string) $value;
    }
}