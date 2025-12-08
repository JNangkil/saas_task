/**
 * Plan model and related interfaces for the application.
 * These interfaces define the structure of plan data and related entities.
 */

/**
 * Main Plan interface representing a subscription plan
 */
export interface IPlan {
    id: number;
    name: string;
    slug: string;
    price: string;
    formatted_price: string;
    billing_interval: 'month' | 'year';
    billing_interval_display: string;
    trial_days: number;
    features: string[];
    limits: IPlanLimits;
    is_popular: boolean;
    metadata: Record<string, any>;
    description?: string;
    promotional_message?: string;
    currency: string;
    currency_symbol: string;
    yearly_discount_percentage?: number;
    monthly_equivalent?: string;
    monthly_equivalent_formatted?: string;
    feature_highlights: string[];
    limit_highlights: string[];
    created_at: string;
    updated_at: string;
}

/**
 * Plan limits interface defining resource constraints
 */
export interface IPlanLimits {
    max_users?: number;
    max_workspaces?: number;
    max_boards?: number;
    max_storage_mb?: number;
    max_api_calls_per_month?: number;
    max_projects?: number;
    max_team_members?: number;
    [key: string]: number | undefined;
}

/**
 * Plan feature interface with additional metadata
 */
export interface IPlanFeature {
    name: string;
    display_name: string;
    description: string;
    category: string;
    available_in_plans: string[];
    popular_in_plans: string[];
}

/**
 * Plan comparison interface for comparing multiple plans
 */
export interface IPlanComparison {
    plans: IPlan[];
    comparison_matrix: {
        features: IPlanComparisonFeature[];
        limits: IPlanComparisonLimit[];
    };
    all_features: string[];
    all_limits: string[];
    feature_categories: IPlanFeatureCategory[];
    recommended_plan?: {
        plan_id: number;
        plan_slug: string;
        reason: string;
    };
}

/**
 * Plan comparison feature interface
 */
export interface IPlanComparisonFeature {
    name: string;
    display_name: string;
    description: string;
    category: string;
    plans: {
        plan_id: number;
        plan_slug: string;
        has_feature: boolean;
        is_highlighted: boolean;
    }[];
}

/**
 * Plan comparison limit interface
 */
export interface IPlanComparisonLimit {
    name: string;
    display_name: string;
    unit: string;
    plans: {
        plan_id: number;
        plan_slug: string;
        value: number;
        is_unlimited: boolean;
        display_value: string;
        is_highlighted: boolean;
    }[];
}

/**
 * Plan feature category interface
 */
export interface IPlanFeatureCategory {
    name: string;
    display_name: string;
    features: string[];
}

/**
 * Plan filter interface for filtering plans
 */
export interface IPlanFilter {
    interval?: 'month' | 'year';
    featured?: boolean;
    has_feature?: string;
    min_price?: number;
    max_price?: number;
    trial_available?: boolean;
    category?: string;
}

/**
 * Current subscription information for a tenant
 */
export interface ICurrentSubscription {
    subscription: {
        id: number;
        status: string;
        status_display: string;
        trial_ends_at?: string;
        ends_at?: string;
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
    };
    plan: IPlan | null;
    usage: {
        users: number;
        workspaces: number;
        boards: number;
    };
}

/**
 * Features list response interface
 */
export interface IFeaturesListResponse {
    features: IPlanFeature[];
    categories: string[];
}

/**
 * Plan usage statistics interface
 */
export interface IPlanUsage {
    users: number;
    workspaces: number;
    boards: number;
    storage_mb?: number;
    api_calls_this_month?: number;
    [key: string]: number | undefined;
}

/**
 * Plan upgrade/downgrade request interface
 */
export interface IPlanChangeRequest {
    new_plan_slug: string;
    billing_interval?: 'month' | 'year';
    immediate?: boolean;
    prorate?: boolean;
}

/**
 * Plan limits usage comparison interface
 */
export interface IPlanLimitUsage {
    limit_name: string;
    limit_value: number;
    current_usage: number;
    usage_percentage: number;
    is_unlimited: boolean;
    is_over_limit: boolean;
    remaining: number;
}

/**
 * Plan recommendation interface
 */
export interface IPlanRecommendation {
    plan: IPlan;
    reason: string;
    score: number;
    matched_features: string[];
    missing_features: string[];
}

/**
 * Plan billing cycle interface
 */
export interface IPlanBillingCycle {
    interval: 'month' | 'year';
    display_name: string;
    multiplier: number;
    discount_percentage?: number;
}

/**
 * Plan feature comparison matrix cell interface
 */
export interface IPlanFeatureMatrixCell {
    has_feature: boolean;
    is_highlighted: boolean;
    display_text: string;
    tooltip?: string;
}

/**
 * Plan limit comparison matrix cell interface
 */
export interface IPlanLimitMatrixCell {
    value: number;
    is_unlimited: boolean;
    display_value: string;
    is_highlighted: boolean;
    tooltip?: string;
}

/**
 * Plan pricing tier interface
 */
export interface IPlanPricingTier {
    name: string;
    slug: string;
    price: number;
    formatted_price: string;
    billing_interval: 'month' | 'year';
    yearly_discount_percentage?: number;
    is_popular: boolean;
    is_enterprise: boolean;
}

/**
 * Plan feature group interface for organizing features
 */
export interface IPlanFeatureGroup {
    name: string;
    display_name: string;
    description: string;
    features: string[];
    icon?: string;
}