# Subscription Limits Middleware

The `SubscriptionLimitMiddleware` enforces subscription limits for tenants based on their active subscription plan. It checks various limits such as user count, workspace count, storage, and feature access.

## Overview

The middleware intercepts incoming requests and validates them against the tenant's subscription limits. If a request would exceed a limit, it returns an appropriate HTTP response with an error message and upgrade prompt.

## Configuration

The middleware is configured through the `config/billing.php` file under the `limits` section:

```php
'limits' => [
    'enabled' => env('BILLING_LIMITS_ENABLED', true),
    'upgrade_url' => env('BILLING_UPGRADE_URL', '/billing/plans'),
    'feature_mappings' => [
        'analytics' => ['analytics.*', 'reports.*'],
        'api_access' => ['api.*'],
        'advanced_integrations' => ['integrations.*', 'webhooks.*'],
        'advanced_permissions' => ['permissions.*', 'roles.*'],
        'custom_themes' => ['themes.*', 'customization.*'],
        'priority_support' => ['support.priority', 'support.premium'],
    ],
    'bypass' => [
        'read_only_operations' => env('BILLING_BYPASS_READ_ONLY', true),
        'super_admins' => env('BILLING_BYPASS_SUPER_ADMINS', true),
        'routes' => [
            'billing.*',
            'subscription.*',
            'webhooks.billing',
        ],
        'paths' => [
            'health',
            'status',
            'webhooks/*',
        ],
    ],
    'storage' => [
        'disk' => env('BILLING_STORAGE_DISK', 'public'),
        'path_pattern' => env('BILLING_STORAGE_PATH_PATTERN', 'tenant_{tenant}'),
    ],
],
```

## Registration

To use the middleware, register it in your `app/Http/Kernel.php` file:

```php
protected $middlewareGroups = [
    'api' => [
        // ... other middleware
        \App\Http\Middleware\TenantResolution::class,
        \App\Http\Middleware\SubscriptionLimitMiddleware::class,
    ],
];
```

## How It Works

### 1. Tenant Resolution

The middleware first attempts to get the current tenant from the request. It looks for:

1. A tenant set in the app container (usually by `TenantResolution` middleware)
2. A `tenant_id` parameter in the request

### 2. Bypass Checks

The middleware checks if the request should bypass limit checks:

- Read-only operations (GET, HEAD, OPTIONS) if `read_only_operations` is enabled
- Super admin users if `super_admins` bypass is enabled
- Routes matching patterns in the `bypass.routes` array
- Paths matching patterns in the `bypass.paths` array

### 3. Subscription Validation

If not bypassed, the middleware validates the tenant's subscription:

- Checks if the tenant has an active subscription
- Verifies the subscription is valid (active or trialing)
- Allows requests within the grace period for canceled subscriptions

### 4. Limit Checks

The middleware performs specific limit checks based on the request type:

#### User Limit

When creating new users (detected by POST requests to `/users` or `/invitations`):

```php
// Example: Check if tenant can add more users
$result = SubscriptionHelper::canAddUsers($tenant, 1);
if (!$result['can']) {
    // Handle limit exceeded
}
```

#### Workspace Limit

When creating new workspaces (detected by POST requests to `/workspaces`):

```php
// Example: Check if tenant can create more workspaces
$result = SubscriptionHelper::canCreateWorkspaces($tenant, 1);
if (!$result['can']) {
    // Handle limit exceeded
}
```

#### Storage Limit

When uploading files (detected by file uploads or `/upload` paths):

```php
// Example: Check if tenant can upload a file
$result = SubscriptionHelper::canUploadFiles($tenant, $fileSizeMb);
if (!$result['can']) {
    // Handle limit exceeded
}
```

#### Feature Access

When accessing restricted features (mapped in configuration):

```php
// Example: Check if tenant can use a feature
$result = SubscriptionHelper::canUseFeature($tenant, 'analytics');
if (!$result['can']) {
    // Handle feature not available
}
```

## Response Format

When a limit is exceeded, the middleware returns a JSON response:

### 402 Payment Required (Resource Limits)

```json
{
    "error": "User Limit Exceeded",
    "message": "You have reached your plan's limit of 5 users. Upgrade your plan to add more users.",
    "upgrade_url": "/billing/plans"
}
```

### 403 Forbidden (Feature Access)

```json
{
    "error": "Feature Not Available",
    "message": "The Analytics feature is not available in your current plan. Upgrade your plan to access this feature.",
    "upgrade_url": "/billing/plans"
}
```

## Using the SubscriptionHelper

The `SubscriptionHelper` class provides utility methods for checking subscription limits throughout your application:

```php
use App\Helpers\SubscriptionHelper;

// Check if tenant can add users
$result = SubscriptionHelper::canAddUsers($tenant, 2);
if (!$result['can']) {
    // Handle limit exceeded
    $message = $result['message'];
}

// Get a summary of all limits
$summary = SubscriptionHelper::getSubscriptionLimitsSummary($tenant);
$usersPercentage = $summary['limits']['users']['percentage'];

// Log a limit violation
SubscriptionHelper::logLimitViolation($tenant, 'users', [
    'current' => 5,
    'max' => 5,
    'attempted' => 1,
]);
```

## Testing

The middleware includes comprehensive tests in `tests/Feature/SubscriptionLimitMiddlewareTest.php`. Run the tests with:

```bash
php artisan test tests/Feature/SubscriptionLimitMiddlewareTest.php
```

## Best Practices

1. **Configure Bypass Rules**: Set appropriate bypass rules for essential operations like billing pages and health checks.

2. **Monitor Limit Violations**: Regularly check logs for limit violations to understand user behavior and plan needs.

3. **Provide Clear Upgrade Paths**: Ensure your upgrade URL leads to a clear plan comparison and upgrade process.

4. **Handle Limits Gracefully**: In your frontend, handle limit responses by showing upgrade prompts and explaining the benefits of higher-tier plans.

5. **Consider Grace Periods**: Implement grace periods for canceled subscriptions to avoid disrupting user workflows.

6. **Track Storage Usage**: Regularly monitor storage usage and implement cleanup processes for unused files.

## Troubleshooting

### Issue: All requests are blocked

**Solution**: Check that `billing.limits.enabled` is set to `true` in your configuration and that tenants have active subscriptions.

### Issue: Storage limit checks are not working

**Solution**: Verify the storage configuration in `billing.limits.storage` and ensure the storage disk is properly configured.

### Issue: Feature access checks are not working

**Solution**: Check that your `feature_mappings` configuration matches your application's routes and that your plans include the required features.

### Issue: Performance concerns

**Solution**: Consider caching subscription data or implementing more efficient storage calculation methods for high-traffic applications.