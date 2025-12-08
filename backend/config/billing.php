<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Default Billing Provider
    |--------------------------------------------------------------------------
    |
    | This option controls the default billing provider that will be used
    | when creating new billing instances. Currently, only 'stripe' is
    | supported, but this can be extended to support other providers.
    |
    */
    'default_provider' => env('BILLING_PROVIDER', 'stripe'),

    /*
    |--------------------------------------------------------------------------
    | Billing Provider Configuration
    |--------------------------------------------------------------------------
    |
    | Here you may configure the settings for each billing provider.
    | Each provider has its own configuration options that are
    | specific to that provider's API.
    |
    */
    'providers' => [
        'stripe' => [
            'model' => App\Services\BillingProviders\StripeBillingProvider::class,
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Webhook Configuration
    |--------------------------------------------------------------------------
    |
    | These settings configure how webhook events are processed from
    | the billing providers. You can specify which events to handle
    | and configure any custom processing logic.
    |
    */
    'webhooks' => [
        'path' => env('BILLING_WEBHOOK_PATH', 'webhooks/billing'),
        'middleware' => ['api'],
    ],

    /*
    |--------------------------------------------------------------------------
    | Currency Configuration
    |--------------------------------------------------------------------------
    |
    | These settings configure the default currency and pricing
    | format for your application. You can override these values
    | on a per-tenant or per-subscription basis.
    |
    */
    'currency' => env('BILLING_CURRENCY', 'USD'),
    'locale' => env('BILLING_LOCALE', 'en_US'),

    /*
    |--------------------------------------------------------------------------
    | Trial Configuration
    |--------------------------------------------------------------------------
    |
    | These settings configure the default trial period for new
    | subscriptions. You can override these values on a per-plan
    | basis in your plan configuration.
    |
    */
    'default_trial_days' => env('BILLING_DEFAULT_TRIAL_DAYS', 14),

    /*
    |--------------------------------------------------------------------------
    | Grace Period Configuration
    |--------------------------------------------------------------------------
    |
    | These settings configure the grace period for subscriptions
    | that have been canceled but are still active until the end
    | of the current billing period.
    |
    */
    'grace_period_days' => env('BILLING_GRACE_PERIOD_DAYS', 7),

    /*
    |--------------------------------------------------------------------------
    | Grace Period Notification Configuration
    |--------------------------------------------------------------------------
    |
    | These settings configure the grace period notification system.
    | You can specify which days to send warning emails and customize
    | the email sender information.
    |
    */
    'grace_period_warnings' => env('BILLING_GRACE_PERIOD_WARNINGS', '1,3,7'),
    'grace_period_from_email' => env('BILLING_GRACE_PERIOD_FROM_EMAIL', null),
    'grace_period_from_name' => env('BILLING_GRACE_PERIOD_FROM_NAME', null),

    /*
    |--------------------------------------------------------------------------
    | Subscription Limit Middleware Configuration
    |--------------------------------------------------------------------------
    |
    | These settings configure the subscription limit middleware that
    | enforces plan limits and feature access. You can configure which
    | routes need limit checking and set bypass rules.
    |
    */
    'limits' => [
        /*
        |--------------------------------------------------------------------------
        | Enable Subscription Limits
        |--------------------------------------------------------------------------
        |
        | This option controls whether the subscription limit middleware is
        | enabled. When disabled, all subscription checks will be bypassed.
        |
        */
        'enabled' => env('BILLING_LIMITS_ENABLED', true),

        /*
        |--------------------------------------------------------------------------
        | Upgrade URL
        |--------------------------------------------------------------------------
        |
        | The URL where users are redirected when they need to upgrade
        | their plan due to limit violations.
        |
        */
        'upgrade_url' => env('BILLING_UPGRADE_URL', '/billing/plans'),

        /*
        |--------------------------------------------------------------------------
        | Feature Mappings
        |--------------------------------------------------------------------------
        |
        | These mappings associate route patterns with specific features.
        | When a request matches a pattern, the corresponding feature
        | access will be checked.
        |
        */
        'feature_mappings' => [
            'analytics' => ['analytics.*', 'reports.*'],
            'api_access' => ['api.*'],
            'advanced_integrations' => ['integrations.*', 'webhooks.*'],
            'advanced_permissions' => ['permissions.*', 'roles.*'],
            'custom_themes' => ['themes.*', 'customization.*'],
            'priority_support' => ['support.priority', 'support.premium'],
        ],

        /*
        |--------------------------------------------------------------------------
        | Bypass Rules
        |--------------------------------------------------------------------------
        |
        | These rules define when subscription limit checks should be bypassed.
        | You can configure specific routes, user roles, or operations that
        | should always be allowed regardless of subscription limits.
        |
        */
        'bypass' => [
            /*
            |--------------------------------------------------------------------------
            | Bypass for Read-Only Operations
            |--------------------------------------------------------------------------
            |
            | When enabled, read-only operations (GET, HEAD, OPTIONS) will
            | bypass subscription limit checks.
            |
            */
            'read_only_operations' => env('BILLING_BYPASS_READ_ONLY', true),

            /*
            |--------------------------------------------------------------------------
            | Bypass for Super Admins
            |--------------------------------------------------------------------------
            |
            | When enabled, users with super admin privileges will bypass
            | subscription limit checks.
            |
            */
            'super_admins' => env('BILLING_BYPASS_SUPER_ADMINS', true),

            /*
            |--------------------------------------------------------------------------
            | Bypass Routes
            |--------------------------------------------------------------------------
            |
            | An array of route names that should bypass subscription
            | limit checks regardless of the operation type.
            |
            */
            'routes' => [
                'billing.*',
                'subscription.*',
                'webhooks.billing',
            ],

            /*
            |--------------------------------------------------------------------------
            | Bypass Paths
            |--------------------------------------------------------------------------
            |
            | An array of URL paths that should bypass subscription
            | limit checks. Supports wildcards.
            |
            */
            'paths' => [
                'health',
                'status',
                'webhooks/*',
            ],
        ],

        /*
        |--------------------------------------------------------------------------
        | Storage Calculation
        |--------------------------------------------------------------------------
        |
        | These settings configure how storage usage is calculated for
        | subscription limit checks.
        |
        */
        'storage' => [
            /*
            |--------------------------------------------------------------------------
            | Storage Disk
            |--------------------------------------------------------------------------
            |
            | The disk to use when calculating storage usage.
            |
            */
            'disk' => env('BILLING_STORAGE_DISK', 'public'),

            /*
            |--------------------------------------------------------------------------
            | Storage Path Pattern
            |--------------------------------------------------------------------------
            |
            | The pattern to use when locating tenant files. The {tenant}
            | placeholder will be replaced with the tenant ID.
            |
            */
            'path_pattern' => env('BILLING_STORAGE_PATH_PATTERN', 'tenant_{tenant}'),
        ],
    ],
];